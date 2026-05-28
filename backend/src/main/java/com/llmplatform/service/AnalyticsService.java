package com.llmplatform.service;

import com.llmplatform.repository.ConversationRepository;
import com.llmplatform.repository.InferenceLogRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class AnalyticsService {

    private final InferenceLogRepository logRepo;
    private final ConversationRepository convRepo;

    public AnalyticsService(InferenceLogRepository logRepo, ConversationRepository convRepo) {
        this.logRepo = logRepo;
        this.convRepo = convRepo;
    }

    public Map<String, Object> getSummary(LocalDateTime since) {
        long totalRequests = logRepo.countByCreatedAtAfter(since);
        Double avgLatency  = logRepo.avgLatencyAfter(since);
        Long totalTokens   = logRepo.sumTokensAfter(since);
        long errorCount    = logRepo.countErrorsAfter(since);
        double successRate = totalRequests > 0
                ? ((double)(totalRequests - errorCount) / totalRequests) * 100 : 100.0;

        // Throughput: requests per minute averaged over the time window
        long windowMinutes = java.time.Duration.between(since, LocalDateTime.now()).toMinutes();
        double rpm = windowMinutes > 0 ? Math.round((double) totalRequests / windowMinutes * 10.0) / 10.0 : 0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalRequests",       totalRequests);
        result.put("avgLatencyMs",        avgLatency != null ? Math.round(avgLatency) : 0);
        result.put("totalTokens",         totalTokens != null ? totalTokens : 0);
        result.put("errorCount",          errorCount);
        result.put("successRate",         Math.round(successRate * 10.0) / 10.0);
        result.put("activeConversations", convRepo.count());
        result.put("throughputRpm",       rpm);
        return result;
    }

    public List<Map<String, Object>> getHourlyLatency(LocalDateTime since) {
        List<Object[]> rows = logRepo.hourlyLatencyAfter(since);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("hour", row[0] + ":00");
            item.put("avg",  row[1] != null ? ((Number) row[1]).longValue() : 0);
            item.put("p95",  row[2] != null ? ((Number) row[2]).longValue() : 0);
            result.add(item);
        }
        return result;
    }

    public List<Map<String, Object>> getDailyTokens(LocalDateTime since) {
        List<Object[]> rows = logRepo.dailyTokensAfter(since);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("date",   row[0] != null ? row[0].toString() : "");
            item.put("input",  row[1] != null ? ((Number) row[1]).longValue() : 0);
            item.put("output", row[2] != null ? ((Number) row[2]).longValue() : 0);
            result.add(item);
        }
        return result;
    }

    public List<Map<String, Object>> getProviderBreakdown(LocalDateTime since) {
        List<Object[]> rows = logRepo.countByProviderAfter(since);
        long total = rows.stream().mapToLong(r -> ((Number) r[1]).longValue()).sum();
        Map<String, String> colors = Map.of("openai","#10a37f","gemini","#4285f4","groq","#f55036");
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            String provider = (String) row[0];
            long count = ((Number) row[1]).longValue();
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name",  capitalize(provider));
            item.put("value", total > 0 ? Math.round((double) count / total * 100) : 0);
            item.put("count", count);
            item.put("color", colors.getOrDefault(provider, "#888"));
            result.add(item);
        }
        return result;
    }

    /** Hourly throughput: requests per minute + total count per hour */
    public List<Map<String, Object>> getHourlyThroughput(LocalDateTime since) {
        List<Object[]> rows = logRepo.hourlyThroughputAfter(since);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            long count = row[1] != null ? ((Number) row[1]).longValue() : 0;
            double rpm  = Math.round(count / 60.0 * 10.0) / 10.0;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("hour",  row[0] + ":00");
            item.put("total", count);
            item.put("rpm",   rpm);
            result.add(item);
        }
        return result;
    }

    /** Hourly error rate: error count + rate % per hour */
    public List<Map<String, Object>> getHourlyErrorRate(LocalDateTime since) {
        List<Object[]> rows = logRepo.hourlyErrorRateAfter(since);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            long total  = row[1] != null ? ((Number) row[1]).longValue() : 0;
            long errors = row[2] != null ? ((Number) row[2]).longValue() : 0;
            double rate = total > 0 ? Math.round((double) errors / total * 1000.0) / 10.0 : 0.0;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("hour",      row[0] + ":00");
            item.put("total",     total);
            item.put("errors",    errors);
            item.put("errorRate", rate);
            result.add(item);
        }
        return result;
    }

    public List<Map<String, Object>> getRecentLogs(LocalDateTime since, String provider, int limit) {
        List<com.llmplatform.entity.InferenceLog> logs = provider != null && !provider.isBlank()
                ? logRepo.findByProviderAndCreatedAtAfterOrderByCreatedAtDesc(provider, since)
                : logRepo.findByCreatedAtAfterOrderByCreatedAtDesc(since);
        List<Map<String, Object>> result = new ArrayList<>();
        for (com.llmplatform.entity.InferenceLog log :
                logs.subList(0, Math.min(limit, logs.size()))) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id",           log.getId());
            item.put("provider",     log.getProvider());
            item.put("model",        log.getModel());
            item.put("latencyMs",    log.getLatencyMs());
            item.put("inputTokens",  log.getInputTokens());
            item.put("outputTokens", log.getOutputTokens());
            item.put("totalTokens",  log.getTotalTokens());
            item.put("status",       log.getStatus());
            item.put("timestamp",    log.getCreatedAt() != null ? log.getCreatedAt().toString() : "");
            item.put("inputPreview", log.getInputPreview());
            item.put("piiDetected",  log.getPiiDetected());
            result.add(item);
        }
        return result;
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    public LocalDateTime sinceFor(String timeRange) {
        return switch (timeRange != null ? timeRange : "24h") {
            case "1h"  -> LocalDateTime.now().minusHours(1);
            case "7d"  -> LocalDateTime.now().minusDays(7);
            case "30d" -> LocalDateTime.now().minusDays(30);
            default    -> LocalDateTime.now().minusHours(24);
        };
    }
}