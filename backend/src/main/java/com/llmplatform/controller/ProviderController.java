package com.llmplatform.controller;

import com.llmplatform.provider.ProviderRegistry;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/providers")
@Tag(name = "Providers", description = "LLM provider information")
public class ProviderController {

    private final ProviderRegistry providerRegistry;

    public ProviderController(ProviderRegistry providerRegistry) {
        this.providerRegistry = providerRegistry;
    }

    @GetMapping
    @Operation(summary = "List all registered LLM providers with availability status")
    public List<Map<String, Object>> list() {
        return providerRegistry.listProviders();
    }

    @GetMapping("/default")
    @Operation(summary = "Get the default (first available) provider and its first model")
    public Map<String, Object> getDefault() {
        String defaultId = providerRegistry.getDefaultProviderId();
        var provider = providerRegistry.get(defaultId);
        String defaultModel = provider.getSupportedModels().isEmpty()
                ? "" : provider.getSupportedModels().get(0);
        return Map.of(
                "provider", defaultId,
                "model", defaultModel,
                "providerName", provider.getProviderName()
        );
    }

    @GetMapping("/{providerId}/models")
    @Operation(summary = "Get supported models for a specific provider")
    public Map<String, Object> getModels(@PathVariable String providerId) {
        var provider = providerRegistry.get(providerId);
        return Map.of(
                "provider", providerId,
                "models", provider.getSupportedModels(),
                "available", provider.isAvailable()
        );
    }
}