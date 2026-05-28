package com.llmplatform.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.*;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI neuralLogOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("NeuralLog — LLM Platform API")
                        .description("""
                                Production-grade LLM inference logging and chatbot platform.
                                
                                **Key endpoints:**
                                - `POST /api/chat/stream` — SSE streaming chat completions
                                - `GET/POST /api/conversations` — Conversation management
                                - `POST /api/ingest/log` — External inference log ingestion
                                - `GET /api/analytics/*` — Observability and metrics
                                - `GET /api/providers` — Provider registry
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("NeuralLog Platform")
                                .url("https://github.com/your-org/neurallog"))
                        .license(new License().name("MIT")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Local dev"),
                        new Server().url("http://backend:8080").description("Docker Compose")
                ));
    }
}