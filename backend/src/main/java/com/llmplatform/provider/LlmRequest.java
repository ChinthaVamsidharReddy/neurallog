package com.llmplatform.provider;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class LlmRequest {
    private String model;
    private List<LlmMessage> messages;
    private Double temperature;
    private Integer maxTokens;
    private String sessionId;
    private String conversationId;

    @Builder.Default
    private boolean stream = true;
}