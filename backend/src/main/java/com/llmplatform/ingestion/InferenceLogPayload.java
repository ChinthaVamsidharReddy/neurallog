package com.llmplatform.ingestion;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InferenceLogPayload {
    private String conversationId;
    private String messageId;
    private String sessionId;
    private String provider;
    private String model;
    private LocalDateTime requestTimestamp;
    private LocalDateTime responseTimestamp;
    private Long latencyMs;
    private Integer inputTokens;
    private Integer outputTokens;
    private String status;
    private String errorMessage;
    private String errorCode;
    private String inputPreview;
    private String outputPreview;
    private Integer requestSizeBytes;
    private Integer responseSizeBytes;
    private Integer retryCount;
}