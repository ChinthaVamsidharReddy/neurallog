package com.llmplatform.provider;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Registry that holds all LlmProvider implementations and routes requests.
 *
 * Smart routing: if the requested provider has no API key configured,
 * the registry automatically falls back to the first available provider
 * instead of throwing an error. This means the app works out of the box
 * with only one API key, regardless of what the frontend sends.
 */
@Service
public class ProviderRegistry {

    private static final Logger log = LoggerFactory.getLogger(ProviderRegistry.class);

    // Preference order for auto-fallback: groq first (fastest/cheapest), then others
    private static final List<String> FALLBACK_ORDER = List.of("groq", "openai", "gemini");

    private final Map<String, LlmProvider> providers;

    public ProviderRegistry(List<LlmProvider> providerList) {
        this.providers = providerList.stream()
                .collect(Collectors.toMap(LlmProvider::getProviderId, p -> p));

        List<String> available = providers.values().stream()
                .filter(LlmProvider::isAvailable)
                .map(LlmProvider::getProviderId)
                .collect(Collectors.toList());

        List<String> disabled = providers.values().stream()
                .filter(p -> !p.isAvailable())
                .map(LlmProvider::getProviderId)
                .collect(Collectors.toList());

        log.info("LLM providers available: {}", available.isEmpty() ? "NONE — set at least one API key!" : available);
        if (!disabled.isEmpty()) {
            log.info("LLM providers disabled (no API key): {}", disabled);
        }
    }

    /**
     * Get a provider by ID, with automatic fallback to the first available provider
     * if the requested one has no API key configured.
     *
     * Example: frontend requests "openai" but only groq key is set →
     *          silently routes to groq instead of returning an error.
     */
    public LlmProvider get(String requestedProviderId) {
        LlmProvider requested = providers.get(requestedProviderId);

        // Happy path: requested provider exists and is configured
        if (requested != null && requested.isAvailable()) {
            return requested;
        }

        // Log the auto-fallback so it's visible in logs
        if (requested != null && !requested.isAvailable()) {
            log.warn("Provider '{}' has no API key configured — looking for available fallback...",
                    requestedProviderId);
        } else {
            log.warn("Unknown provider '{}' requested — looking for available fallback...",
                    requestedProviderId);
        }

        // Try preferred fallback order first
        for (String fallbackId : FALLBACK_ORDER) {
            LlmProvider fallback = providers.get(fallbackId);
            if (fallback != null && fallback.isAvailable()) {
                log.info("Auto-routing to provider '{}' (fallback from '{}')",
                        fallbackId, requestedProviderId);
                return fallback;
            }
        }

        // Try any available provider as last resort
        Optional<LlmProvider> anyAvailable = providers.values().stream()
                .filter(LlmProvider::isAvailable)
                .findFirst();

        if (anyAvailable.isPresent()) {
            log.info("Auto-routing to provider '{}' (last resort fallback)",
                    anyAvailable.get().getProviderId());
            return anyAvailable.get();
        }

        // Nothing configured at all
        throw new IllegalStateException(
            "No LLM providers are configured. Please add at least one API key to application.properties:\n" +
            "  groq.api.key=gsk_...\n" +
            "  openai.api.key=sk-...\n" +
            "  gemini.api.key=..."
        );
    }

    /**
     * Get the best available provider ID (for frontend auto-selection on startup).
     */
    public String getDefaultProviderId() {
        for (String id : FALLBACK_ORDER) {
            LlmProvider p = providers.get(id);
            if (p != null && p.isAvailable()) return id;
        }
        return providers.values().stream()
                .filter(LlmProvider::isAvailable)
                .map(LlmProvider::getProviderId)
                .findFirst()
                .orElse("groq");
    }

    public List<Map<String, Object>> listProviders() {
        return providers.values().stream()
                .map(p -> Map.<String, Object>of(
                        "id", p.getProviderId(),
                        "name", p.getProviderName(),
                        "models", p.getSupportedModels(),
                        "available", p.isAvailable()
                ))
                .collect(Collectors.toList());
    }

    public boolean hasProvider(String providerId) {
        return providers.containsKey(providerId);
    }
}