package com.llmplatform.controller;

import com.llmplatform.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@Tag(name = "Analytics", description = "Observability and inference metrics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/summary")
    @Operation(summary = "KPI summary: requests, latency, tokens, throughput, error rate")
    public Map<String, Object> summary(
            @RequestParam(defaultValue = "24h") String timeRange,
            @RequestParam(required = false)     String provider) {
        return analyticsService.getSummary(analyticsService.sinceFor(timeRange));
    }

    @GetMapping("/latency")
    @Operation(summary = "Hourly average + P95 latency")
    public List<Map<String, Object>> latency(
            @RequestParam(defaultValue = "24h") String timeRange) {
        return analyticsService.getHourlyLatency(analyticsService.sinceFor(timeRange));
    }

    @GetMapping("/tokens")
    @Operation(summary = "Daily token consumption (input + output)")
    public List<Map<String, Object>> tokens(
            @RequestParam(defaultValue = "7d") String timeRange) {
        return analyticsService.getDailyTokens(analyticsService.sinceFor(timeRange));
    }

    @GetMapping("/providers")
    @Operation(summary = "Provider breakdown by request share")
    public List<Map<String, Object>> providers(
            @RequestParam(defaultValue = "24h") String timeRange) {
        return analyticsService.getProviderBreakdown(analyticsService.sinceFor(timeRange));
    }

    @GetMapping("/throughput")
    @Operation(summary = "Hourly throughput: requests per minute + total count")
    public List<Map<String, Object>> throughput(
            @RequestParam(defaultValue = "24h") String timeRange) {
        return analyticsService.getHourlyThroughput(analyticsService.sinceFor(timeRange));
    }

    @GetMapping("/errors")
    @Operation(summary = "Hourly error rate: count + percentage per hour")
    public List<Map<String, Object>> errors(
            @RequestParam(defaultValue = "24h") String timeRange) {
        return analyticsService.getHourlyErrorRate(analyticsService.sinceFor(timeRange));
    }

    @GetMapping("/logs")
    @Operation(summary = "Recent inference logs with all metadata")
    public List<Map<String, Object>> logs(
            @RequestParam(defaultValue = "24h") String timeRange,
            @RequestParam(required = false)     String provider,
            @RequestParam(defaultValue = "50")  int limit) {
        return analyticsService.getRecentLogs(
                analyticsService.sinceFor(timeRange), provider, Math.min(limit, 200));
    }
}