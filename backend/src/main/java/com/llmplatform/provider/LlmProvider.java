package com.llmplatform.provider;

import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * Provider abstraction layer — all LLM providers implement this interface.
 * Supports both streaming and non-streaming completions.
 */
public interface LlmProvider {

    /** Unique provider identifier (e.g. "openai", "gemini", "groq") */
    String getProviderId();

    /** Human-readable name */
    String getProviderName();

    /** List of supported model identifiers */
    List<String> getSupportedModels();

    /**
     * Streaming chat completion via SSE.
     *
     * @param request  The chat request
     * @param onChunk  Callback for each text chunk
     * @param onDone   Callback when stream completes
     * @param onError  Callback on error
     */
    void streamChat(
            LlmRequest request,
            Consumer<String> onChunk,
            Runnable onDone,
            Consumer<Exception> onError
    );

    /** Whether this provider is currently configured and usable */
    boolean isAvailable();
}