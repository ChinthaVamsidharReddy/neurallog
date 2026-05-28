package com.llmplatform.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "messages", indexes = {
    @Index(name = "idx_msg_conv_id", columnList = "conversation_id"),
    @Index(name = "idx_msg_created", columnList = "created_at")
})
@Data @NoArgsConstructor @AllArgsConstructor @Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // Excluded from JSON — clients already know the conversationId from context
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    // Expose just the FK value for convenience
    @Column(name = "conversation_id", insertable = false, updatable = false)
    private String conversationId;

    @Column(nullable = false, length = 20)
    private String role; // user | assistant | system

    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "input_tokens")
    private Integer inputTokens;

    @Column(name = "output_tokens")
    private Integer outputTokens;

    @Column(name = "model_used", length = 100)
    private String modelUsed;

    @Column(name = "provider_used", length = 50)
    private String providerUsed;

    @Column(name = "latency_ms")
    private Long latencyMs;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}