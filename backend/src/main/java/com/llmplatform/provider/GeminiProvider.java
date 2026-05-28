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

@Component
public class GeminiProvider implements LlmProvider {

    private static final Logger log = LoggerFactory.getLogger(GeminiProvider.class);

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta}")
    private String apiUrl;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .build();

    private final ObjectMapper mapper = new ObjectMapper();

    @Override public String getProviderId()   { return "gemini"; }
    @Override public String getProviderName() { return "Google Gemini"; }

    @Override
    public List<String> getSupportedModels() {
        return List.of("gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash");
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
                "Gemini provider is not configured. Add GEMINI_API_KEY to your environment or application.properties."));
            return;
        }
        try {
            ObjectNode body = mapper.createObjectNode();
            ArrayNode contents = mapper.createArrayNode();

            for (LlmMessage m : request.getMessages()) {
                if ("system".equals(m.getRole())) continue;
                ObjectNode content = mapper.createObjectNode();
                content.put("role", "user".equals(m.getRole()) ? "user" : "model");
                ArrayNode parts = mapper.createArrayNode();
                ObjectNode part = mapper.createObjectNode();
                part.put("text", m.getContent());
                parts.add(part);
                content.set("parts", parts);
                contents.add(content);
            }
            body.set("contents", contents);

            ObjectNode genConfig = mapper.createObjectNode();
            genConfig.put("maxOutputTokens", request.getMaxTokens() != null ? request.getMaxTokens() : 2048);
            genConfig.put("temperature", request.getTemperature() != null ? request.getTemperature() : 0.7);
            body.set("generationConfig", genConfig);

            String url = String.format("%s/models/%s:streamGenerateContent?key=%s&alt=sse",
                    apiUrl, request.getModel(), apiKey);

            Request httpRequest = new Request.Builder()
                    .url(url)
                    .addHeader("Content-Type", "application/json")
                    .post(RequestBody.create(mapper.writeValueAsString(body),
                            MediaType.parse("application/json")))
                    .build();

            try (Response response = httpClient.newCall(httpRequest).execute()) {
                if (!response.isSuccessful()) {
                    String errBody = response.body() != null ? response.body().string() : "Unknown";
                    onError.accept(new RuntimeException("Gemini API error " + response.code() + ": " + errBody));
                    return;
                }
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(response.body().byteStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (line.startsWith("data: ")) {
                            String data = line.substring(6).trim();
                            try {
                                JsonNode json = mapper.readTree(data);
                                String text = json.path("candidates").path(0)
                                        .path("content").path("parts").path(0).path("text").asText("");
                                if (!text.isEmpty()) onChunk.accept(text);
                            } catch (Exception ignored) {}
                        }
                    }
                }
            }
            onDone.run();
        } catch (Exception e) {
            log.error("Gemini stream error", e);
            onError.accept(e);
        }
    }
}