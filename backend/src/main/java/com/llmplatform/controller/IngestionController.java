package com.llmplatform.controller;

import com.llmplatform.ingestion.IngestionService;
import com.llmplatform.ingestion.InferenceLogPayload;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ingest")
@Tag(name = "Ingestion", description = "External inference log ingestion endpoint (SDK/middleware use)")
public class IngestionController {

    private final IngestionService ingestionService;

    public IngestionController(IngestionService ingestionService) {
        this.ingestionService = ingestionService;
    }

    /**
     * External endpoint for the middleware SDK to push inference logs.
     * Accepts payloads asynchronously and returns 202 Accepted immediately.
     */
    @PostMapping("/log")
    @Operation(summary = "Ingest an inference log",
               description = "Accepts raw inference metadata, validates, redacts PII, and persists")
    public ResponseEntity<Map<String, String>> ingestLog(@RequestBody InferenceLogPayload payload) {
        ingestionService.ingestAsync(payload);
        return ResponseEntity.accepted().body(Map.of("status", "accepted", "message", "Log queued for ingestion"));
    }

    @PostMapping("/batch")
    @Operation(summary = "Ingest multiple inference logs in a single request")
    public ResponseEntity<Map<String, Object>> ingestBatch(
            @RequestBody java.util.List<InferenceLogPayload> payloads) {
        payloads.forEach(ingestionService::ingestAsync);
        return ResponseEntity.accepted().body(Map.of(
                "status", "accepted",
                "count", payloads.size(),
                "message", payloads.size() + " logs queued for ingestion"
        ));
    }
}