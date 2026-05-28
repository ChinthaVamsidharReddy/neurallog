package com.llmplatform.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
public class OpenAiProvider implements LlmProvider {

    private static final Logger log = LoggerFactory.getLogger(OpenAiProvider.class);

    // Empty string default — Spring never fails injection even if key is absent from properties
    @Value("${openai.api.key:}")
    private String apiKey;

    @Value("${openai.api.url:https://api.openai.com/v1}")
    private String apiUrl;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build();

    private final ObjectMapper mapper = new ObjectMapper();

    @Override public String getProviderId()   { return "openai"; }
    @Override public String getProviderName() { return "OpenAI"; }

    @Override
    public List<String> getSupportedModels() {
        return List.of("gpt-4.1", "gpt-4.1-mini", "gpt-4o");
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
                "OpenAI provider is not configured. Add OPENAI_API_KEY to your environment or application.properties."));
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
                    String errBody = response.body() != null ? response.body().string() : "Unknown error";
                    onError.accept(new RuntimeException("OpenAI API error " + response.code() + ": " + errBody));
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
            log.error("OpenAI stream error", e);
            onError.accept(e);
        }
    }
}