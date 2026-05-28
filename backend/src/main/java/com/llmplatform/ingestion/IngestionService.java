package com.llmplatform.ingestion;

import com.llmplatform.entity.InferenceLog;
import com.llmplatform.repository.InferenceLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.regex.Pattern;

/**
 * Ingestion pipeline: validate → sanitize → redact PII → persist.
 * Runs asynchronously to not block the streaming response.
 */
@Service
public class IngestionService {

    private static final Logger log = LoggerFactory.getLogger(IngestionService.class);

    // PII patterns
    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}");
    private static final Pattern PHONE_PATTERN =
            Pattern.compile("(\\+?\\d[\\d\\-\\s\\.]{7,}\\d)");
    private static final Pattern CREDIT_CARD_PATTERN =
            Pattern.compile("\\b(?:\\d[ \\-]?){13,16}\\b");

    private final InferenceLogRepository logRepository;

    public IngestionService(InferenceLogRepository logRepository) {
        this.logRepository = logRepository;
    }

    /**
     * Asynchronously ingest an inference log.
     */
    @Async
    public void ingestAsync(InferenceLogPayload payload) {
        try {
            // 1. Validate
            if (!isValid(payload)) {
                log.warn("Dropping invalid inference log payload: missing required fields");
                return;
            }

            // 2. Sanitize & redact PII
            boolean piiFound = false;
            String inputPreview = payload.getInputPreview();
            String outputPreview = payload.getOutputPreview();

            if (inputPreview != null) {
                String redacted = redactPii(inputPreview);
                piiFound = !redacted.equals(inputPreview);
                inputPreview = redacted;
                inputPreview = truncate(inputPreview, 500);
            }
            if (outputPreview != null) {
                String redacted = redactPii(outputPreview);
                if (!redacted.equals(outputPreview)) piiFound = true;
                outputPreview = redacted;
                outputPreview = truncate(outputPreview, 500);
            }

            // 3. Build entity
            InferenceLog entity = InferenceLog.builder()
                    .conversationId(payload.getConversationId())
                    .messageId(payload.getMessageId())
                    .sessionId(payload.getSessionId())
                    .provider(payload.getProvider())
                    .model(payload.getModel())
                    .requestTimestamp(payload.getRequestTimestamp())
                    .responseTimestamp(payload.getResponseTimestamp())
                    .latencyMs(payload.getLatencyMs())
                    .inputTokens(payload.getInputTokens())
                    .outputTokens(payload.getOutputTokens())
                    .totalTokens((payload.getInputTokens() != null ? payload.getInputTokens() : 0)
                            + (payload.getOutputTokens() != null ? payload.getOutputTokens() : 0))
                    .status(payload.getStatus() != null ? payload.getStatus() : "success")
                    .errorMessage(truncate(payload.getErrorMessage(), 500))
                    .errorCode(payload.getErrorCode())
                    .inputPreview(inputPreview)
                    .outputPreview(outputPreview)
                    .requestSizeBytes(payload.getRequestSizeBytes())
                    .responseSizeBytes(payload.getResponseSizeBytes())
                    .piiDetected(piiFound)
                    .retryCount(payload.getRetryCount() != null ? payload.getRetryCount() : 0)
                    .build();

            // 4. Persist
            logRepository.save(entity);
            log.debug("Ingested inference log: provider={} model={} latency={}ms status={}",
                    entity.getProvider(), entity.getModel(), entity.getLatencyMs(), entity.getStatus());

        } catch (Exception e) {
            log.error("Failed to ingest inference log", e);
        }
    }

    private boolean isValid(InferenceLogPayload p) {
        return p != null
                && p.getProvider() != null && !p.getProvider().isBlank()
                && p.getModel() != null && !p.getModel().isBlank();
    }

    private String redactPii(String text) {
        if (text == null) return null;
        text = EMAIL_PATTERN.matcher(text).replaceAll("[EMAIL_REDACTED]");
        text = PHONE_PATTERN.matcher(text).replaceAll("[PHONE_REDACTED]");
        text = CREDIT_CARD_PATTERN.matcher(text).replaceAll("[CC_REDACTED]");
        return text;
    }

    private String truncate(String text, int maxLen) {
        if (text == null || text.length() <= maxLen) return text;
        return text.substring(0, maxLen - 3) + "...";
    }
}