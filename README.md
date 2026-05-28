# ⚡ NeuralLog — LLM Inference Logging & Chatbot Platform

A production-grade, full-stack platform for multi-provider LLM chat with complete inference observability. Built with React 18, Spring Boot 3.2, MySQL 8, and Docker.

---

## 📸 Screenshots



### Chat Interface

![Chat Interface](docs/screenshots/01-chat-interface.png)

---

### Welcome Screen

![Welcome Screen](docs/screenshots/02-welcome-screen.png)

---

### Conversation Sidebar — Multi-turn & Resume


![Sidebar](docs/screenshots/03-sidebar-conversations.png)

---

### Provider Selector

![Provider Selector](docs/screenshots/04-provider-selector.png)

---

### Analytics Dashboard — Overview


![Analytics Overview](docs/screenshots/05-analytics-overview.png)

---

### Analytics Dashboard — Charts


![Analytics Charts](docs/screenshots/06-analytics-charts.png)

---

### Inference Logs Table


![Inference Logs](docs/screenshots/07-inference-logs-table.png)

---

### Swagger API Docs


![Swagger UI](docs/screenshots/08-swagger-ui.png)

---

## ✨ Features

| Feature | Detail |
|---------|--------|
| **Multi-turn Chat** | Persistent conversations with full context window (last 20 messages) |
| **Streaming Responses** | Real-time token streaming via Server-Sent Events (SSE) |
| **Multi-provider** | OpenAI GPT-4.1, Google Gemini, Groq — switchable per conversation |
| **Cancel Generation** | Stop mid-stream with a single click |
| **Conversation History** | Resume, rename, delete any past conversation |
| **Inference Logging** | Every API call logged: latency, tokens, provider, status, timestamps |
| **Lightweight SDK Wrapper** | `LlmSdkWrapper` captures all metadata, ships logs async to ingestion pipeline |
| **Ingestion Pipeline** | Validate → Redact PII → Extract metadata → Persist to MySQL |
| **PII Redaction** | Emails, phone numbers, credit cards auto-redacted before storage |
| **Analytics Dashboard** | Latency, Throughput, Error Rate, Token consumption, Provider breakdown |
| **Event-based Ingestion** | `@Async` decoupled ingestion — zero latency impact on streaming |
| **Swagger / OpenAPI** | Full API docs at `/swagger-ui.html` |
| **Docker Compose** | One-command startup: `docker compose up --build` |
| **Kubernetes** | Complete K8s manifests with HPA, Ingress, PVC, Secrets |

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose v2+
- API key from at least one provider (OpenAI, Gemini, or Groq)

### 1. Clone & configure

```bash
git clone https://github.com/ChinthaVamsidharReddy/neurallog.git
cd neurallog

cp .env.example .env
# Open .env and add your API key(s)
```

### 2. Start everything with one command

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| MySQL | localhost:3306 |

### 3. Local development (without Docker)

**Start only MySQL via Docker:**
```bash
docker compose up mysql -d
```

**Run backend:**
```bash
cd backend
./mvnw clean spring-boot:run
# Keys can also be passed inline:
# ./mvnw spring-boot:run -Dspring-boot.run.systemProperties="groq.api.key=gsk_..."
```

**Run frontend:**
```bash
cd frontend
npm install
npm start
# Proxies /api/* to http://localhost:8080 automatically
```

---

## 🗂 Project Structure

```
neurallog/
├── docker-compose.yml
├── .env.example
├── docs/
│   └── screenshots/              ← Add your screenshots here
├── docker/
│   └── mysql-init.sql            ← Schema DDL + seed data
├── k8s/                          ← Kubernetes manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── mysql-pvc.yaml
│   ├── mysql-deployment.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── ingress.yaml              ← nginx with SSE proxy-buffering off
│   ├── hpa.yaml                  ← Auto-scales backend 2→10 pods
│   └── README.md
│
├── frontend/                     ← React 18 SPA
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── App.js                ← Auto-detects available provider on startup
│       ├── contexts/AppContext.js← Global state (useReducer)
│       ├── services/api.js       ← Axios REST client + SSE stream parser
│       └── components/
│           ├── layout/           ← Header, Layout
│           ├── sidebar/          ← Sidebar, ProviderSelector (availability-aware)
│           ├── chat/             ← ChatView, MessageBubble, ChatInput, WelcomeScreen
│           └── analytics/        ← AnalyticsDashboard (Recharts)
│
└── backend/                      ← Spring Boot 3.2 / Java 17
    ├── Dockerfile
    └── src/main/java/com/llmplatform/
        ├── LlmPlatformApplication.java
        ├── config/               ← WebConfig (CORS, async thread pool), OpenApiConfig
        ├── controller/           ← ChatController, ConversationController,
        │                           AnalyticsController, ProviderController,
        │                           IngestionController
        ├── service/              ← ChatService, ConversationService, AnalyticsService
        ├── sdk/                  ← LlmSdkWrapper (middleware logger)
        ├── provider/             ← LlmProvider interface + OpenAI, Gemini, Groq impls
        │                           ProviderRegistry (smart auto-fallback routing)
        ├── ingestion/            ← IngestionService (async), InferenceLogPayload
        ├── entity/               ← Conversation, Message, InferenceLog
        ├── repository/           ← JPA repos with analytics JPQL/native queries
        └── middleware/           ← GlobalExceptionHandler, RequestLoggingFilter
```

---

## 🏛 Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (React 18 SPA)                                       │
│  ┌──────────┐   ┌───────────────┐   ┌──────────────────────┐ │
│  │ Sidebar  │   │   ChatView    │   │ Analytics Dashboard  │ │
│  │ List /   │   │ SSE streaming │   │ Latency · Throughput │ │
│  │ Resume / │   │ Markdown render│  │ Errors · Tokens      │ │
│  │ Delete   │   │ Cancel button │   │ Provider breakdown   │ │
│  └────┬─────┘   └──────┬────────┘   └──────────┬───────────┘ │
└───────┼────────────────┼──────────────────────┼─────────────┘
        │ REST           │ SSE stream            │ REST
        ▼                ▼                       ▼
┌──────────────────────────────────────────────────────────────┐
│  Spring Boot 3.2 (port 8080)                                  │
│                                                               │
│  /api/conversations  ←→  ConversationService                  │
│  /api/chat/stream    ←→  ChatService                          │
│                              │                                │
│                              ▼                                │
│                         LlmSdkWrapper  ← captures metadata   │
│                              │                                │
│                              ▼                                │
│                        ProviderRegistry (auto-fallback)       │
│                        ├── OpenAiProvider → api.openai.com    │
│                        ├── GeminiProvider → googleapis.com    │
│                        └── GroqProvider   → api.groq.com      │
│                              │                                │
│                              ▼ @Async (non-blocking)          │
│  /api/ingest/log     ←→  IngestionService                     │
│                           validate → redact PII → persist     │
│                                                               │
│  /api/analytics/*    ←→  AnalyticsService                     │
└───────────────────────────────┬──────────────────────────────┘
                                │ JPA / Hibernate
                                ▼
┌──────────────────────────────────────────────────────────────┐
│  MySQL 8.x                                                    │
│  ├── conversations   (id, title, provider, model, …)          │
│  ├── messages        (id, conv_id, role, content, tokens, …)  │
│  └── inference_logs  (id, provider, model, latency, pii, …)   │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔌 Lightweight SDK Wrapper

`LlmSdkWrapper` is a middleware component that wraps every LLM API call and automatically captures inference metadata without any changes needed in business logic:

```java
// Usage inside ChatService
sdk.streamWithLogging(
    llmRequest, provider, sessionId, conversationId,
    onChunk, onDone, onError
);
```

**What it captures automatically:**

| Field | Description |
|-------|-------------|
| `provider` | openai / gemini / groq |
| `model` | e.g. llama-3.3-70b-versatile |
| `requestTimestamp` | When the call started |
| `responseTimestamp` | When the last token arrived |
| `latencyMs` | End-to-end response time |
| `inputTokens` | Estimated from input length |
| `outputTokens` | Estimated from output length |
| `status` | success / error / timeout |
| `errorMessage` | Full error text on failure |
| `sessionId` | Browser session identifier |
| `conversationId` | Conversation UUID |
| `inputPreview` | First 200 chars of user message |
| `outputPreview` | First 200 chars of assistant reply |
| `requestSizeBytes` | Raw request body size |
| `responseSizeBytes` | Raw response body size |

All logs are shipped asynchronously via `IngestionService` — zero latency added to the streaming response.

---

## 📡 Ingestion Pipeline

```
ChatService / External SDK
        │
        ▼  POST /api/ingest/log → 202 Accepted immediately
        │
        ▼  @Async Spring thread pool (non-blocking)
        │
  ┌──────────────────────────────────────────┐
  │  IngestionService                         │
  │                                           │
  │  1. Validate                              │
  │     • provider + model required           │
  │     • drops silently if invalid           │
  │                                           │
  │  2. Redact PII                            │
  │     • email   → [EMAIL_REDACTED]          │
  │     • phone   → [PHONE_REDACTED]          │
  │     • credit card → [CC_REDACTED]         │
  │     • sets pii_detected = true if found   │
  │                                           │
  │  3. Extract metadata                      │
  │     • compute total_tokens                │
  │     • truncate previews to 500 chars      │
  │     • set default status = "success"      │
  │                                           │
  │  4. Persist to MySQL inference_logs       │
  └──────────────────────────────────────────┘
```

**Batch ingestion** is also supported: `POST /api/ingest/batch` accepts an array of payloads.

---

## 📊 Logging Strategy

Every LLM call goes through `LlmSdkWrapper` → `IngestionService`:

- **Synchronous path** (streaming response to user): provider → SSE chunks → client. Zero ingestion overhead.
- **Async path** (logging): after each call completes, metadata is shipped on a separate thread pool. If the database is slow or unavailable, it never affects the user.
- **Structured logs** via SLF4J at DEBUG level — every ingestion records `provider`, `model`, `latency`, `status`.
- **PII is redacted before any storage** — raw user text never hits the database unchanged.
- **External ingestion endpoint** (`POST /api/ingest/log`) allows any external SDK or service to ship logs to the same pipeline.

---

## 🗄 Schema Design Decisions

### `conversations`
- UUID primary key — no sequential enumeration attacks
- `session_id` indexed — isolates conversations per browser session
- `message_count` and `total_tokens` are denormalized counters — avoids expensive `COUNT`/`SUM` on every sidebar load
- `updated_at` auto-managed by MySQL `ON UPDATE CURRENT_TIMESTAMP`

### `messages`
- Foreign key to `conversations` with `CASCADE DELETE` — deleting a conversation cleans all its messages atomically
- `LONGTEXT` for `content` — LLM responses can be very long
- `latency_ms` stored per assistant message — enables per-message performance analysis

### `inference_logs`
- **Intentionally decoupled from `messages`** — designed for external SDK ingestion, not just this app
- `(provider, created_at)` composite index — covers the most expensive analytics filter pattern
- `pii_detected` boolean flag — compliance auditing without storing what was redacted
- `input_preview` / `output_preview` capped at 500 chars **after** PII redaction
- `retry_count` field — foundation for future retry/replay logic

---

## 📈 Analytics API

| Endpoint | Returns |
|----------|---------|
| `GET /api/analytics/summary` | totalRequests, avgLatencyMs, totalTokens, successRate, errorCount, throughputRpm |
| `GET /api/analytics/latency` | Hourly avg + P95 latency for area chart |
| `GET /api/analytics/throughput` | Hourly req/min + total count for throughput chart |
| `GET /api/analytics/errors` | Hourly error count + error rate % for error chart |
| `GET /api/analytics/tokens` | Daily input/output tokens for bar chart |
| `GET /api/analytics/providers` | Per-provider request share (%) for pie chart |
| `GET /api/analytics/logs` | Recent inference logs with all metadata |

All endpoints accept `?timeRange=1h|24h|7d|30d` and `?provider=openai|gemini|groq`.

---

## 🔌 Provider Abstraction

```java
interface LlmProvider {
    String getProviderId();
    String getProviderName();
    List<String> getSupportedModels();
    void streamChat(LlmRequest, Consumer<String> onChunk, Runnable onDone, Consumer<Exception> onError);
    boolean isAvailable();  // false if API key is blank
}
```

`ProviderRegistry` auto-routes to the first available provider if the requested one has no key:

```
Request: provider=openai (no key set)
    → tries groq   → has key ✓ → routes here
    → logs: "Auto-routing to 'groq' (fallback from 'openai')"
```

Adding a new provider: implement `LlmProvider`, annotate `@Component` — auto-registered. No factory, no switch statement.

---

## 📊 Streaming Architecture (SSE vs WebSockets)

| Concern | SSE (chosen) | WebSocket |
|---------|-------------|-----------|
| Protocol | Standard HTTP/1.1 | Separate upgrade handshake |
| Direction | Server → Client (all LLM needs) | Bidirectional |
| Load balancer | Works with nginx/ALB out of the box | Needs sticky sessions |
| Spring Boot | `SseEmitter` built-in, zero config | Extra dependency |
| Reconnect | Browser reconnects automatically | Must implement manually |
| Buffering | Set `proxy-buffering: off` in nginx | Not an issue |

---

## 🔑 API Key Configuration

| Provider | Property | Get Key |
|----------|----------|---------|
| OpenAI | `openai.api.key` | https://platform.openai.com/api-keys |
| Google Gemini | `gemini.api.key` | https://aistudio.google.com/app/apikey |
| Groq | `groq.api.key` | https://console.groq.com/keys |

Keys can be set in `application.properties` directly or as environment variables (`OPENAI_API_KEY`, etc.). Providers with blank keys start fine — they report `available: false` and the backend auto-routes to a working provider.

---

## 📦 Example API Payloads

### Stream a chat message
```bash
curl -N -X POST "http://localhost:8080/api/chat/stream?provider=groq&model=llama-3.3-70b-versatile&sessionId=s1" \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain database indexing in simple terms"}'
```

SSE response:
```
data: {"type":"meta","conversationId":"abc-123","provider":"groq","model":"llama-3.3-70b-versatile"}
data: {"type":"chunk","content":"Database"}
data: {"type":"chunk","content":" indexing"}
data: {"type":"chunk","content":" works like"}
...
data: [DONE]
```

### Ingest an external inference log
```bash
curl -X POST http://localhost:8080/api/ingest/log \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "groq",
    "model": "llama-3.3-70b-versatile",
    "sessionId": "ext-session-001",
    "latencyMs": 310,
    "inputTokens": 150,
    "outputTokens": 420,
    "status": "success",
    "inputPreview": "What is a neural network?",
    "outputPreview": "A neural network is a computational model..."
  }'
```

Response: `202 Accepted`

---

## ⚡ Scaling Considerations

**Backend is fully stateless** — run any number of replicas behind a load balancer. SSE connections live for the duration of one response only, so no sticky sessions needed.

**Ingestion throughput** — at 100 req/s, `@Async` thread pool handles it easily. For 10,000+ req/s, extract `IngestionService` behind a Kafka topic: producer returns in microseconds, consumers batch-insert to MySQL.

**Database** — all analytics queries hit indexed columns. For >10M `inference_logs` rows, partition by month on `created_at`. For write-heavy loads, use a separate read replica for analytics queries.

**Kubernetes HPA** — backend auto-scales 2→10 pods on CPU>70%. Frontend is static Nginx — scales cheaply.

---

## 🛡 Failure Handling

| Failure | Behaviour |
|---------|-----------|
| Provider API returns 4xx/5xx | `onError` fires → error SSE chunk to client → log ingested with `status=error` |
| Provider key missing | `isAvailable()=false` → auto-routed to next configured provider |
| MySQL unavailable at startup | Spring Boot fails fast with a clear connection error |
| MySQL unavailable during ingestion | Exception caught, logged at ERROR, response unaffected (async) |
| SSE client disconnects mid-stream | `emitter.send()` throws → caught silently, stream exits cleanly |
| SSE timeout (>120s) | Emitter times out, client auto-reconnects on next message |
| PII in payload | Redacted before storage, `pii_detected=true` flag set for audit |
| Invalid ingestion payload | Dropped with WARN log — never crashes the ingestion service |

---

## 🔮 What I Would Improve With More Time

- **Kafka / RabbitMQ** — replace `@Async` ingestion with a durable message queue for guaranteed delivery, replay, and backpressure handling
- **Real token counts** — use provider response headers for exact token usage instead of estimates
- **Prometheus + Grafana** — expose `/actuator/metrics` and wire to Grafana for production dashboards
- **Rate limiting** — per-session limits via Redis to prevent abuse
- **Cost tracking** — per-model pricing table with total spend analytics
- **Auth** — JWT or OAuth2 for multi-user deployments
- **Conversation search** — full-text search across message history
- **Export** — download conversations as Markdown or JSON

---

## 🧑‍💻 Development Notes

**Swagger UI:** http://localhost:8080/swagger-ui.html

**Adding a new LLM provider:**
```java
@Component
public class AnthropicProvider implements LlmProvider {
    @Override public String getProviderId() { return "anthropic"; }
    @Override public boolean isAvailable()  { return !apiKey.isBlank(); }
    // implement streamChat() using Anthropic's SSE API
}
```
Spring auto-discovers and registers it in `ProviderRegistry`. No other changes needed.

**Clean build (fixes stale class errors):**
```bash
cd backend && mvn clean spring-boot:run
```

---

## 📄 License

MIT — free for personal projects, portfolio demos, and production deployments.
 
 
