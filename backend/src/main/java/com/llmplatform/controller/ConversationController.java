package com.llmplatform.controller;

import com.llmplatform.entity.Conversation;
import com.llmplatform.entity.Message;
import com.llmplatform.service.ConversationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/conversations")
@Tag(name = "Conversations", description = "Conversation management")
public class ConversationController {

    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    @GetMapping
    @Operation(summary = "List all conversations")
    public List<Conversation> list() {
        return conversationService.listAll();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a conversation by ID")
    public ResponseEntity<Conversation> get(@PathVariable String id) {
        return conversationService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Create a new conversation")
    public Conversation create(@RequestBody Map<String, String> body) {
        Conversation conv = Conversation.builder()
                .title(body.getOrDefault("title", "New Conversation"))
                .provider(body.getOrDefault("provider", "openai"))
                .model(body.getOrDefault("model", "gpt-4.1"))
                .sessionId(body.get("sessionId"))
                .messageCount(0)
                .totalTokens(0L)
                .build();
        return conversationService.create(conv);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update conversation title")
    public ResponseEntity<Conversation> update(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        return conversationService.update(id, body.getOrDefault("title", ""))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a conversation and all its messages")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        conversationService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/messages")
    @Operation(summary = "Get all messages for a conversation")
    public ResponseEntity<List<Message>> getMessages(@PathVariable String id) {
        return conversationService.findById(id)
                .map(c -> ResponseEntity.ok(conversationService.getMessages(id)))
                .orElse(ResponseEntity.notFound().build());
    }
}