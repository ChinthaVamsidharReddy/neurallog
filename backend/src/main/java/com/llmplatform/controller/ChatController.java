package com.llmplatform.controller;

import com.llmplatform.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@Tag(name = "Chat", description = "Streaming chat completions via SSE")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    /**
     * SSE streaming endpoint for chat completions.
     * Clients connect and receive chunks as they are generated.
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Stream a chat completion",
               description = "Opens an SSE stream and emits JSON chunks as the LLM generates tokens")
    public SseEmitter streamChat(
            @RequestParam(required = false) String conversationId,
            @RequestParam(defaultValue = "openai") String provider,
            @RequestParam(defaultValue = "gpt-4.1") String model,
            @RequestParam(required = false) String sessionId,
            @RequestBody Map<String, String> body
    ) {
        String message = body.getOrDefault("message", "").trim();
        if (message.isEmpty()) {
            SseEmitter emitter = new SseEmitter();
            try {
                emitter.send(SseEmitter.event().data("{\"error\":\"message is required\"}"));
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        return chatService.streamChat(conversationId, message, provider, model, sessionId);
    }
}