package com.llmplatform.sdk;

import com.llmplatform.ingestion.IngestionService;
import com.llmplatform.ingestion.InferenceLogPayload;
import com.llmplatform.provider.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  NeuralLog LLM SDK Wrapper                                       ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  A lightweight middleware wrapper around every LLM API call.     ║
 * ║                                                                  ║
 * ║  Automatically captures and ships:                               ║
 * ║  • provider name + model name                                    ║
 * ║  • request / response timestamps                                 ║
 * ║  • latency (ms)                                                  ║
 * ║  • token usage (estimated)                                       ║
 * ║  • response status (success / error)                             ║
 * ║  • error messages and codes                                      ║
 * ║  • session ID + conversation ID                                  ║
 * ║  • input / output previews (PII-redacted before storage)         ║
 * ║  • request / response size in bytes                              ║
 * ║                                                                  ║
 * ║  Usage:                                                          ║
 * ║    sdk.streamWithLogging(request, provider, onChunk, ...)        ║
 * ║                                                                  ║
 * ║  All logs are shipped asynchronously to the ingestion pipeline   ║
 * ║  via IngestionService — zero latency impact on streaming.        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
@Component
public class LlmSdkWrapper {

    private static final Logger log = LoggerFactory.getLogger(LlmSdkWrapper.class);

    private final IngestionService ingestionService;

    public LlmSdkWrapper(IngestionService ingestionService) {
        this.ingestionService = ingestionService;
    }

    /**
     * Wrap a streaming LLM call with automatic inference logging.
     *
     * Every token chunk is passed through to {@code onChunk}.
     * On completion, latency / token / status metadata is captured
     * and shipped asynchronously to the ingestion pipeline.
     *
     * @param request       The LLM request (model, messages, params)
     * @param provider      The resolved provider implementation
     * @param sessionId     Session identifier for grouping
     * @param conversationId Conversation identifier
     * @param onChunk       Callback per token chunk
     * @param onDone        Callback on stream completion
     * @param onError       Callback on error
     */
    public void streamWithLogging(
            LlmRequest request,
            LlmProvider provider,
            String sessionId,
            String conversationId,
            Consumer<String> onChunk,
            Runnable onDone,
            Consumer<Exception> onError
    ) {
        final LocalDateTime requestTimestamp = LocalDateTime.now();
        final StringBuilder outputBuffer = new StringBuilder();
        final String requestId = UUID.randomUUID().toString();

        // Estimate input size from message content
        final String inputPreview = extractInputPreview(request.getMessages());
        final int inputBytes = inputPreview.getBytes().length;

        log.debug("[SDK] Starting stream — provider={} model={} sessionId={} requestId={}",
                provider.getProviderId(), request.getModel(), sessionId, requestId);

        provider.streamChat(
            request,

            // ── onChunk: pass through + accumulate for logging ──────────
            chunk -> {
                outputBuffer.append(chunk);
                try {
                    onChunk.accept(chunk);
                } catch (Exception e) {
                    log.warn("[SDK] onChunk callback threw: {}", e.getMessage());
                }
            },

            // ── onDone: capture metadata + ship log ─────────────────────
            () -> {
                LocalDateTime responseTimestamp = LocalDateTime.now();
                long latencyMs = java.time.Duration.between(requestTimestamp, responseTimestamp).toMillis();
                String outputContent = outputBuffer.toString();

                log.debug("[SDK] Stream complete — provider={} latency={}ms requestId={}",
                        provider.getProviderId(), latencyMs, requestId);

                // Ship inference log asynchronously — never blocks the response
                ingestionService.ingestAsync(InferenceLogPayload.builder()
                        .conversationId(conversationId)
                        .messageId(requestId)
                        .sessionId(sessionId)
                        .provider(provider.getProviderId())
                        .model(request.getModel())
                        .requestTimestamp(requestTimestamp)
                        .responseTimestamp(responseTimestamp)
                        .latencyMs(latencyMs)
                        .inputTokens(estimateTokens(inputPreview))
                        .outputTokens(estimateTokens(outputContent))
                        .status("success")
                        .inputPreview(safe(inputPreview, 200))
                        .outputPreview(safe(outputContent, 200))
                        .requestSizeBytes(inputBytes)
                        .responseSizeBytes(outputContent.getBytes().length)
                        .build());

                try {
                    onDone.run();
                } catch (Exception e) {
                    log.warn("[SDK] onDone callback threw: {}", e.getMessage());
                }
            },

            // ── onError: log failure + ship error log ───────────────────
            error -> {
                LocalDateTime responseTimestamp = LocalDateTime.now();
                long latencyMs = java.time.Duration.between(requestTimestamp, responseTimestamp).toMillis();

                log.warn("[SDK] Stream error — provider={} latency={}ms error={} requestId={}",
                        provider.getProviderId(), latencyMs, error.getMessage(), requestId);

                ingestionService.ingestAsync(InferenceLogPayload.builder()
                        .conversationId(conversationId)
                        .messageId(requestId)
                        .sessionId(sessionId)
                        .provider(provider.getProviderId())
                        .model(request.getModel())
                        .requestTimestamp(requestTimestamp)
                        .responseTimestamp(responseTimestamp)
                        .latencyMs(latencyMs)
                        .status("error")
                        .errorMessage(error.getMessage())
                        .inputPreview(safe(inputPreview, 200))
                        .requestSizeBytes(inputBytes)
                        .build());

                try {
                    onError.accept(error);
                } catch (Exception e) {
                    log.warn("[SDK] onError callback threw: {}", e.getMessage());
                }
            }
        );
    }

    // ── Private helpers ────────────────────────────────────────────────

    private String extractInputPreview(List<LlmMessage> messages) {
        if (messages == null || messages.isEmpty()) return "";
        // Use the last user message as the input preview
        return messages.stream()
                .filter(m -> "user".equals(m.getRole()))
                .reduce((a, b) -> b)
                .map(LlmMessage::getContent)
                .orElse("");
    }

    private int estimateTokens(String text) {
        return text == null ? 0 : (int) Math.ceil(text.length() / 4.0);
    }

    private String safe(String text, int max) {
        if (text == null) return null;
        return text.length() <= max ? text : text.substring(0, max);
    }
}