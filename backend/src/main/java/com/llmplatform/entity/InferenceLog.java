package com.llmplatform.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "inference_logs", indexes = {
    @Index(name = "idx_log_provider", columnList = "provider"),
    @Index(name = "idx_log_model", columnList = "model"),
    @Index(name = "idx_log_status", columnList = "status"),
    @Index(name = "idx_log_session", columnList = "session_id"),
    @Index(name = "idx_log_created", columnList = "created_at"),
    @Index(name = "idx_log_conv", columnList = "conversation_id")
})
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class InferenceLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "conversation_id", length = 100)
    private String conversationId;

    @Column(name = "message_id", length = 100)
    private String messageId;

    @Column(name = "session_id", length = 100)
    private String sessionId;

    @Column(nullable = false, length = 50)
    private String provider;

    @Column(nullable = false, length = 100)
    private String model;

    @Column(name = "request_timestamp")
    private LocalDateTime requestTimestamp;

    @Column(name = "response_timestamp")
    private LocalDateTime responseTimestamp;

    @Column(name = "latency_ms")
    private Long latencyMs;

    @Column(name = "input_tokens")
    private Integer inputTokens;

    @Column(name = "output_tokens")
    private Integer outputTokens;

    @Column(name = "total_tokens")
    private Integer totalTokens;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "success"; // success | error | timeout | cancelled

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "error_code", length = 50)
    private String errorCode;

    @Column(name = "input_preview", length = 500)
    private String inputPreview;

    @Column(name = "output_preview", length = 500)
    private String outputPreview;

    @Column(name = "request_size_bytes")
    private Integer requestSizeBytes;

    @Column(name = "response_size_bytes")
    private Integer responseSizeBytes;

    @Column(name = "pii_detected")
    @Builder.Default
    private Boolean piiDetected = false;

    @Column(name = "retry_count")
    @Builder.Default
    private Integer retryCount = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}