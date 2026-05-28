package com.llmplatform.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.*;
import okhttp3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/**
 * Groq provider — OpenAI-compatible API, ultra-fast inference.
 */
@Component
public class GroqProvider implements LlmProvider {

    private static final Logger log = LoggerFactory.getLogger(GroqProvider.class);

    @Value("${groq.api.key:}")
    private String apiKey;

    @Value("${groq.api.url:https://api.groq.com/openai/v1}")
    private String apiUrl;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .build();

    private final ObjectMapper mapper = new ObjectMapper();

    @Override public String getProviderId()   { return "groq"; }
    @Override public String getProviderName() { return "Groq"; }

    @Override
    public List<String> getSupportedModels() {
        return List.of("llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768");
    }

    @Override
    public boolean isAvailable() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Override
    public void streamChat(LlmRequest request,
                           Consumer<String> onChunk,
                           Runnable onDone,
                           Consumer<Exception> onError) {
        if (!isAvailable()) {
            onError.accept(new RuntimeException(
                "Groq provider is not configured. Add GROQ_API_KEY to your environment or application.properties."));
            return;
        }
        try {
            ObjectNode body = mapper.createObjectNode();
            body.put("model", request.getModel());
            body.put("stream", true);
            body.put("max_tokens", request.getMaxTokens() != null ? request.getMaxTokens() : 2048);
            body.put("temperature", request.getTemperature() != null ? request.getTemperature() : 0.7);

            ArrayNode msgs = mapper.createArrayNode();
            for (LlmMessage m : request.getMessages()) {
                ObjectNode node = mapper.createObjectNode();
                node.put("role", m.getRole());
                node.put("content", m.getContent());
                msgs.add(node);
            }
            body.set("messages", msgs);

            Request httpRequest = new Request.Builder()
                    .url(apiUrl + "/chat/completions")
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .addHeader("Content-Type", "application/json")
                    .post(RequestBody.create(mapper.writeValueAsString(body),
                            MediaType.parse("application/json")))
                    .build();

            try (Response response = httpClient.newCall(httpRequest).execute()) {
                if (!response.isSuccessful()) {
                    String errBody = response.body() != null ? response.body().string() : "Unknown";
                    onError.accept(new RuntimeException("Groq API error " + response.code() + ": " + errBody));
                    return;
                }
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(response.body().byteStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (line.startsWith("data: ")) {
                            String data = line.substring(6).trim();
                            if ("[DONE]".equals(data)) { onDone.run(); return; }
                            try {
                                JsonNode json = mapper.readTree(data);
                                JsonNode delta = json.path("choices").path(0).path("delta").path("content");
                                if (!delta.isMissingNode() && !delta.isNull()) {
                                    onChunk.accept(delta.asText());
                                }
                            } catch (Exception ignored) {}
                        }
                    }
                }
            }
            onDone.run();
        } catch (Exception e) {
            log.error("Groq stream error", e);
            onError.accept(e);
        }
    }
}