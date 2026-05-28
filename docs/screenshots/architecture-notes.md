# Architecture Notes — NeuralLog

## Overview

NeuralLog is a full-stack LLM observability and inference logging platform built using React 18, Spring Boot 3.2, MySQL 8, and Docker. The platform provides a modern multi-provider chatbot interface with real-time streaming responses while capturing detailed inference metadata for analytics, observability, and debugging.

The system is designed around a modular architecture with clear separation between frontend UI, provider abstraction, inference logging middleware, ingestion pipeline, analytics services, and persistent storage.

---

# System Architecture

The application consists of four major layers:

1. Frontend Client (React)
2. Backend API Layer (Spring Boot)
3. Inference Logging & Ingestion Pipeline
4. MySQL Persistence Layer

Frontend and backend communicate using REST APIs and Server-Sent Events (SSE) for real-time streaming responses.

---

# Frontend Architecture

The frontend is implemented as a React 18 single-page application with a modular component structure.

### Main UI Modules

* Chat Interface
* Conversation Sidebar
* Provider Selector
* Analytics Dashboard
* Streaming Response Viewer

### Key Features

* Multi-turn conversations
* Resume and delete conversations
* Real-time token streaming
* Cancel ongoing responses
* Provider switching
* Analytics visualizations

### State Management

Global application state is managed using React Context API and useReducer for predictable state transitions and centralized conversation management.

### Streaming Design

Streaming responses are implemented using Server-Sent Events (SSE). SSE was selected instead of WebSockets because:

* LLM streaming is server-to-client only
* SSE works over standard HTTP
* simpler implementation
* automatic browser reconnect support
* easier deployment behind reverse proxies

---

# Backend Architecture

The backend is implemented using Spring Boot 3.2 and follows a layered architecture.

### Main Layers

* Controllers
* Services
* Provider Abstraction Layer
* SDK Wrapper
* Ingestion Pipeline
* Repository Layer

### Controller Layer

Responsible for:

* chat APIs
* conversation APIs
* analytics APIs
* ingestion endpoints

### Service Layer

Contains business logic for:

* chat orchestration
* conversation management
* analytics aggregation
* provider routing

### Provider Abstraction

The system uses a provider abstraction interface (`LlmProvider`) which standardizes communication across multiple LLM vendors.

Implemented providers:

* OpenAI
* Google Gemini
* Groq

This architecture allows new providers to be added with minimal changes by implementing the shared interface.

---

# Inference Logging Strategy

A lightweight middleware component called `LlmSdkWrapper` wraps every LLM request.

The wrapper automatically captures:

* provider
* model
* timestamps
* latency
* token estimates
* request status
* session ID
* conversation ID
* input preview
* output preview
* request/response size

The wrapper is completely decoupled from business logic and acts as an observability layer around provider calls.

---

# Ingestion Flow

The ingestion pipeline is designed to operate asynchronously to avoid impacting user-facing latency.

### Flow

1. User sends message
2. ChatService routes request to provider
3. Streaming response is returned to frontend
4. LlmSdkWrapper captures inference metadata
5. Metadata is asynchronously forwarded to IngestionService
6. IngestionService validates payload
7. PII redaction is applied
8. Metadata is normalized and enriched
9. Processed logs are stored in MySQL

The ingestion path is intentionally decoupled from the chat response path so database delays never affect user experience.

---

# PII Redaction

Before persistence, the ingestion layer scans payloads for:

* email addresses
* phone numbers
* credit card patterns

Sensitive values are replaced with redaction tokens before database storage.

Example:

* [john@gmail.com](mailto:john@gmail.com) → [EMAIL_REDACTED]

This ensures logs remain analytics-safe while preserving operational visibility.

---

# Database Design

MySQL is used as the primary relational database.

### Main Tables

#### conversations

Stores:

* conversation metadata
* provider information
* session tracking
* token counters

#### messages

Stores:

* user messages
* assistant responses
* timestamps
* token estimates
* latency metrics

#### inference_logs

Stores:

* provider metadata
* latency
* status
* ingestion data
* request previews
* error information
* PII detection flags

### Design Decisions

* UUIDs used for conversation IDs
* indexed provider + timestamp columns for analytics
* denormalized counters for faster dashboard queries
* inference logs separated from messages for extensibility

---

# Analytics Architecture

Analytics endpoints aggregate data directly from inference logs and messages.

Metrics include:

* request throughput
* average latency
* success rate
* error rate
* provider distribution
* token consumption

The frontend dashboard visualizes metrics using Recharts.

---

# Scaling Considerations

The backend is designed to remain stateless.

### Horizontal Scaling

Multiple backend instances can run behind a load balancer without sticky sessions.

### Ingestion Scaling

Current ingestion uses asynchronous Spring thread pools. For larger-scale workloads, ingestion can be migrated to:

* Kafka
* RabbitMQ
* Redis Streams

### Database Scaling

Future improvements could include:

* read replicas
* table partitioning
* time-series storage
* analytics warehousing

---

# Failure Handling Assumptions

The platform prioritizes user experience over strict logging guarantees.

### Current Assumptions

* chat responses should never fail because ingestion fails
* ingestion failures are logged asynchronously
* provider failures return graceful error responses
* missing provider keys trigger fallback routing
* invalid ingestion payloads are discarded safely

### Error Isolation

The ingestion system is intentionally isolated from streaming response generation.

This prevents:

* database slowdowns
* ingestion exceptions
* analytics failures

from impacting live chat interactions.

---

# Tradeoffs Made

### SSE instead of WebSockets

Chosen for simplicity and lower operational overhead.

### Async Ingestion instead of Kafka

Simpler implementation suitable for internship-scale systems while preserving scalability options.

### Token Estimation

Current implementation estimates token usage from text length instead of exact provider billing APIs to reduce provider coupling.

### Stateless Backend

Simplifies scaling and deployment at the cost of more database reads.

---

# Future Improvements

With additional time, planned improvements include:

* Kafka-based ingestion queue
* Prometheus + Grafana monitoring
* exact token accounting
* Redis caching
* authentication and RBAC
* cost tracking dashboards
* conversation search
* export functionality
* distributed tracing
* rate limiting

---

# Deployment

The project supports:

* Docker Compose local deployment
* Kubernetes deployment manifests
* environment-variable based configuration
* containerized frontend and backend services

A single command can boot the entire stack:

```bash
docker compose up --build
```

This starts:

* React frontend
* Spring Boot backend
* MySQL database

---

# Conclusion

NeuralLog was designed as a production-inspired LLM observability platform focused on:

* modular architecture
* real-time inference tracking
* provider abstraction
* scalable ingestion
* analytics visibility
* operational reliability

The project demonstrates full-stack engineering, distributed system design concepts, AI integration, and observability-focused architecture patterns suitable for modern LLM applications.
