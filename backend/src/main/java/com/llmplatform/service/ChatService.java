package com.llmplatform.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.llmplatform.entity.Conversation;
import com.llmplatform.entity.Message;
import com.llmplatform.ingestion.IngestionService;
import com.llmplatform.ingestion.InferenceLogPayload;
import com.llmplatform.provider.*;
import com.llmplatform.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final ProviderRegistry providerRegistry;
    private final ConversationRepository conversationRepo;
    private final MessageRepository messageRepo;
    private final IngestionService ingestionService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ExecutorService executor = Executors.newCachedThreadPool();

    public ChatService(ProviderRegistry providerRegistry,
                       ConversationRepository conversationRepo,
                       MessageRepository messageRepo,
                       IngestionService ingestionService) {
        this.providerRegistry = providerRegistry;
        this.conversationRepo = conversationRepo;
        this.messageRepo = messageRepo;
        this.ingestionService = ingestionService;
    }

    public SseEmitter streamChat(String conversationId, String userMessage,
                                  String providerName, String model, String sessionId) {

        SseEmitter emitter = new SseEmitter(120_000L);

        executor.submit(() -> {
            LocalDateTime requestTime = LocalDateTime.now();
            StringBuilder accumulated = new StringBuilder();

            try {
                // 1. Resolve or create conversation
                Conversation conversation = getOrCreateConversation(
                        conversationId, providerName, model, sessionId, userMessage);
                String resolvedConvId = conversation.getId();

                // 2. Load history BEFORE saving new user message
                List<Message> history = messageRepo
                        .findByConversationIdOrderByCreatedAtAsc(resolvedConvId);
                List<LlmMessage> llmMessages = buildMessageList(history, userMessage);

                // 3. Persist user message
                messageRepo.save(Message.builder()
                        .conversation(conversation)
                        .role("user")
                        .content(userMessage)
                        .build());

                // 4. Send meta frame — frontend uses this to get the real conversationId
                sendEvent(emitter, "data", Map.of(
                        "type", "meta",
                        "conversationId", resolvedConvId,
                        "provider", providerName,
                        "model", model
                ));

                // 5. Resolve provider (with auto-fallback)
                LlmProvider provider = providerRegistry.get(providerName);
                log.info("Chat request: provider={} model={} conv={}", 
                         provider.getProviderId(), model, resolvedConvId);

                LlmRequest llmRequest = LlmRequest.builder()
                        .model(model)
                        .messages(llmMessages)
                        .temperature(0.7)
                        .maxTokens(2048)
                        .stream(true)
                        .sessionId(sessionId)
                        .conversationId(resolvedConvId)
                        .build();

                CountDownLatch latch = new CountDownLatch(1);

                // 6. Stream tokens — each text chunk sent as {"type":"chunk","content":"..."}
                provider.streamChat(
                    llmRequest,

                    // onChunk — called for every token/word
                    chunk -> {
                        accumulated.append(chunk);
                        try {
                            sendEvent(emitter, "data", Map.of(
                                    "type", "chunk",
                                    "content", chunk
                            ));
                        } catch (Exception e) {
                            log.debug("Emitter write failed: {}", e.getMessage());
                        }
                    },

                    // onDone — called when provider finishes
                    () -> {
                        LocalDateTime responseTime = LocalDateTime.now();
                        long latency = java.time.Duration.between(requestTime, responseTime).toMillis();
                        String assistantContent = accumulated.toString();

                        log.info("Stream complete: provider={} latency={}ms tokens~{}",
                                 provider.getProviderId(), latency, estimateTokens(assistantContent));

                        // Persist assistant reply
                        Message assistantMsg = Message.builder()
                                .conversation(conversation)
                                .role("assistant")
                                .content(assistantContent.isEmpty() ? "(empty response)" : assistantContent)
                                .modelUsed(model)
                                .providerUsed(provider.getProviderId())
                                .latencyMs(latency)
                                .build();
                        messageRepo.save(assistantMsg);

                        // Update conversation counters
                        conversation.setMessageCount(conversation.getMessageCount() + 2);
                        conversationRepo.save(conversation);

                        // Async log ingestion
                        ingestionService.ingestAsync(InferenceLogPayload.builder()
                                .conversationId(resolvedConvId)
                                .messageId(assistantMsg.getId())
                                .sessionId(sessionId)
                                .provider(provider.getProviderId())
                                .model(model)
                                .requestTimestamp(requestTime)
                                .responseTimestamp(responseTime)
                                .latencyMs(latency)
                                .inputTokens(estimateTokens(userMessage))
                                .outputTokens(estimateTokens(assistantContent))
                                .status("success")
                                .inputPreview(safe(userMessage, 200))
                                .outputPreview(safe(assistantContent, 200))
                                .requestSizeBytes(userMessage.getBytes().length)
                                .responseSizeBytes(assistantContent.getBytes().length)
                                .build());

                        // Send [DONE] — this is the ONLY completion signal the frontend needs.
                        // Do NOT send a {"type":"done"} frame before this — it confuses the
                        // frontend parser into calling onDone before content is flushed.
                        try {
                            emitter.send(SseEmitter.event().data("[DONE]"));
                            emitter.complete();
                        } catch (Exception e) {
                            log.debug("Emitter complete (client may have disconnected): {}", e.getMessage());
                        }
                        latch.countDown();
                    },

                    // onError
                    error -> {
                        LocalDateTime responseTime = LocalDateTime.now();
                        long latency = java.time.Duration.between(requestTime, responseTime).toMillis();
                        log.error("Provider [{}] error after {}ms: {}",
                                  providerName, latency, error.getMessage());

                        ingestionService.ingestAsync(InferenceLogPayload.builder()
                                .conversationId(resolvedConvId)
                                .sessionId(sessionId)
                                .provider(providerName)
                                .model(model)
                                .requestTimestamp(requestTime)
                                .responseTimestamp(responseTime)
                                .latencyMs(latency)
                                .status("error")
                                .errorMessage(error.getMessage())
                                .inputPreview(safe(userMessage, 200))
                                .build());

                        try {
                            sendEvent(emitter, "data", Map.of(
                                    "type", "error",
                                    "error", error.getMessage() != null ? error.getMessage() : "Provider error"
                            ));
                            emitter.complete();
                        } catch (Exception ex) {
                            emitter.completeWithError(ex);
                        }
                        latch.countDown();
                    }
                );

                latch.await(120, TimeUnit.SECONDS);

            } catch (Exception e) {
                log.error("Chat stream top-level error", e);
                ingestionService.ingestAsync(InferenceLogPayload.builder()
                        .sessionId(sessionId).provider(providerName).model(model)
                        .requestTimestamp(requestTime).responseTimestamp(LocalDateTime.now())
                        .status("error").errorMessage(e.getMessage()).build());
                try {
                    sendEvent(emitter, "data", Map.of("type", "error", "error", "Internal server error"));
                    emitter.complete();
                } catch (Exception ex) {
                    emitter.completeWithError(ex);
                }
            }
        });

        return emitter;
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private void sendEvent(SseEmitter emitter, String eventName, Map<String, Object> data) {
        try {
            String json = objectMapper.writeValueAsString(data);
            emitter.send(SseEmitter.event().name(eventName).data(json));
        } catch (IOException e) {
            log.trace("sendEvent [{}] failed: {}", eventName, e.getMessage());
        } catch (Exception e) {
            log.trace("sendEvent error: {}", e.getMessage());
        }
    }

    private Conversation getOrCreateConversation(String convId, String provider,
                                                  String model, String sessionId, String firstMsg) {
        if (convId != null && !convId.isBlank()) {
            return conversationRepo.findById(convId)
                    .orElseGet(() -> createConversation(provider, model, sessionId, firstMsg));
        }
        return createConversation(provider, model, sessionId, firstMsg);
    }

    private Conversation createConversation(String provider, String model,
                                             String sessionId, String firstMsg) {
        String title = firstMsg.length() > 60 ? firstMsg.substring(0, 60) + "..." : firstMsg;
        return conversationRepo.save(Conversation.builder()
                .title(title).provider(provider).model(model)
                .sessionId(sessionId).messageCount(0).totalTokens(0L).build());
    }

    private List<LlmMessage> buildMessageList(List<Message> history, String newUserMessage) {
        List<LlmMessage> messages = new ArrayList<>();
        messages.add(LlmMessage.builder()
                .role("system")
                .content("You are a helpful, knowledgeable, and concise AI assistant. Provide clear and accurate responses.")
                .build());
        int start = Math.max(0, history.size() - 20);
        for (Message m : history.subList(start, history.size())) {
            messages.add(LlmMessage.builder().role(m.getRole()).content(m.getContent()).build());
        }
        messages.add(LlmMessage.builder().role("user").content(newUserMessage).build());
        return messages;
    }

    private int estimateTokens(String text) {
        return text == null ? 0 : (int) Math.ceil(text.length() / 4.0);
    }

    private String safe(String text, int max) {
        if (text == null) return null;
        return text.length() <= max ? text : text.substring(0, max);
    }
}