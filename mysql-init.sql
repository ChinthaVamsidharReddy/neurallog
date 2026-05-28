-- NeuralLog Database Schema
-- MySQL 8.x compatible

CREATE DATABASE IF NOT EXISTS llmplatform
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE llmplatform;

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id          VARCHAR(36)  PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    session_id  VARCHAR(100),
    provider    VARCHAR(50),
    model       VARCHAR(100),
    message_count INT DEFAULT 0,
    total_tokens  BIGINT DEFAULT 0,
    created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_session_id (session_id),
    INDEX idx_created_at (created_at),
    INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB;

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id              VARCHAR(36)   PRIMARY KEY,
    conversation_id VARCHAR(36)   NOT NULL,
    role            VARCHAR(20)   NOT NULL,
    content         LONGTEXT      NOT NULL,
    input_tokens    INT,
    output_tokens   INT,
    model_used      VARCHAR(100),
    provider_used   VARCHAR(50),
    latency_ms      BIGINT,
    created_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_msg_conv_id (conversation_id),
    INDEX idx_msg_created (created_at),
    CONSTRAINT fk_msg_conv FOREIGN KEY (conversation_id)
        REFERENCES conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Inference logs table (core of the ingestion pipeline)
CREATE TABLE IF NOT EXISTS inference_logs (
    id                  VARCHAR(36)  PRIMARY KEY,
    conversation_id     VARCHAR(100),
    message_id          VARCHAR(100),
    session_id          VARCHAR(100),
    provider            VARCHAR(50)  NOT NULL,
    model               VARCHAR(100) NOT NULL,
    request_timestamp   DATETIME(6),
    response_timestamp  DATETIME(6),
    latency_ms          BIGINT,
    input_tokens        INT,
    output_tokens       INT,
    total_tokens        INT,
    status              VARCHAR(20)  NOT NULL DEFAULT 'success',
    error_message       VARCHAR(500),
    error_code          VARCHAR(50),
    input_preview       VARCHAR(500),
    output_preview      VARCHAR(500),
    request_size_bytes  INT,
    response_size_bytes INT,
    pii_detected        BOOLEAN DEFAULT FALSE,
    retry_count         INT DEFAULT 0,
    created_at          DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    -- Indexes for analytics queries
    INDEX idx_log_provider  (provider),
    INDEX idx_log_model     (model),
    INDEX idx_log_status    (status),
    INDEX idx_log_session   (session_id),
    INDEX idx_log_created   (created_at),
    INDEX idx_log_conv      (conversation_id),
    INDEX idx_log_pii       (pii_detected),
    -- Composite for time-range + provider queries
    INDEX idx_log_prov_time (provider, created_at)
) ENGINE=InnoDB;

-- Seed some demo inference logs for analytics dashboard
INSERT INTO conversations (id, title, session_id, provider, model, message_count, total_tokens, created_at, updated_at)
VALUES
  ('demo-conv-1', 'Getting started with NeuralLog', 'demo-session', 'openai', 'gpt-4.1', 4, 1200, NOW() - INTERVAL 2 HOUR, NOW() - INTERVAL 2 HOUR),
  ('demo-conv-2', 'Python async patterns explained', 'demo-session', 'groq', 'llama-3.3-70b-versatile', 6, 2800, NOW() - INTERVAL 5 HOUR, NOW() - INTERVAL 5 HOUR),
  ('demo-conv-3', 'Kubernetes deployment strategies', 'demo-session', 'gemini', 'gemini-2.0-flash', 2, 900, NOW() - INTERVAL 12 HOUR, NOW() - INTERVAL 12 HOUR);

INSERT INTO inference_logs (id, conversation_id, session_id, provider, model, request_timestamp, response_timestamp, latency_ms, input_tokens, output_tokens, total_tokens, status, input_preview, output_preview, request_size_bytes, response_size_bytes, created_at)
VALUES
  (UUID(), 'demo-conv-1', 'demo-session', 'openai',  'gpt-4.1',                 NOW()-INTERVAL 23 HOUR, NOW()-INTERVAL 23 HOUR, 812,  120,  380, 500, 'success', 'Explain what NeuralLog does',              'NeuralLog is an LLM inference platform...',  440,  1520, NOW()-INTERVAL 23 HOUR),
  (UUID(), 'demo-conv-2', 'demo-session', 'groq',    'llama-3.3-70b-versatile', NOW()-INTERVAL 22 HOUR, NOW()-INTERVAL 22 HOUR, 310,  200,  620, 820, 'success', 'Write an async Python example',            'Here is an async Python example using...',   800,  2480, NOW()-INTERVAL 22 HOUR),
  (UUID(), 'demo-conv-1', 'demo-session', 'openai',  'gpt-4.1',                 NOW()-INTERVAL 20 HOUR, NOW()-INTERVAL 20 HOUR, 945,  150,  410, 560, 'success', 'How does SSE differ from WebSockets?',     'SSE (Server-Sent Events) is a one-way...',    600,  1640, NOW()-INTERVAL 20 HOUR),
  (UUID(), 'demo-conv-3', 'demo-session', 'gemini',  'gemini-2.0-flash',        NOW()-INTERVAL 18 HOUR, NOW()-INTERVAL 18 HOUR, 654,  180,  520, 700, 'success', 'Describe Kubernetes rolling updates',      'Rolling updates in Kubernetes allow...',      720,  2080, NOW()-INTERVAL 18 HOUR),
  (UUID(), NULL,          'demo-session', 'openai',  'gpt-4o',                  NOW()-INTERVAL 16 HOUR, NOW()-INTERVAL 16 HOUR, 1102, 300,  750, 1050,'success', 'Compare REST vs GraphQL performance',      'REST and GraphQL both have their...',         1200, 3000, NOW()-INTERVAL 16 HOUR),
  (UUID(), NULL,          'demo-session', 'groq',    'mixtral-8x7b-32768',      NOW()-INTERVAL 14 HOUR, NOW()-INTERVAL 14 HOUR, 290,  100,  280, 380, 'success', 'Quicksort implementation in Go',           'Here is a quicksort in Go...',                400,  1120, NOW()-INTERVAL 14 HOUR),
  (UUID(), NULL,          'demo-session', 'gemini',  'gemini-1.5-pro',          NOW()-INTERVAL 12 HOUR, NOW()-INTERVAL 12 HOUR, 1350, 400,  900, 1300,'success', 'Summarize the SOLID principles',           'SOLID is an acronym for five design...',      1600, 3600, NOW()-INTERVAL 12 HOUR),
  (UUID(), NULL,          'demo-session', 'openai',  'gpt-4.1-mini',            NOW()-INTERVAL 10 HOUR, NOW()-INTERVAL 10 HOUR, 720,  90,   240, 330, 'error',   'Translate to Japanese: Hello world',       NULL,                                          360,  0,    NOW()-INTERVAL 10 HOUR),
  (UUID(), NULL,          'demo-session', 'groq',    'llama-3.1-8b-instant',    NOW()-INTERVAL 8  HOUR, NOW()-INTERVAL 8  HOUR, 190,  80,   200, 280, 'success', 'What is a transformer model?',             'A transformer model is a deep learning...',   320,  800,  NOW()-INTERVAL 8  HOUR),
  (UUID(), NULL,          'demo-session', 'openai',  'gpt-4.1',                 NOW()-INTERVAL 6  HOUR, NOW()-INTERVAL 6  HOUR, 880,  220,  580, 800, 'success', 'Explain database indexing strategies',     'Database indexes improve query performance...', 880, 2320, NOW()-INTERVAL 6  HOUR),
  (UUID(), NULL,          'demo-session', 'gemini',  'gemini-2.0-flash',        NOW()-INTERVAL 4  HOUR, NOW()-INTERVAL 4  HOUR, 540,  160,  440, 600, 'success', 'Docker multi-stage build example',         'Multi-stage builds in Docker allow...',        640,  1760, NOW()-INTERVAL 4  HOUR),
  (UUID(), NULL,          'demo-session', 'openai',  'gpt-4.1',                 NOW()-INTERVAL 2  HOUR, NOW()-INTERVAL 2  HOUR, 1020, 280,  680, 960, 'success', 'Best practices for React performance',     'To optimize React performance, consider...',  1120, 2720, NOW()-INTERVAL 2  HOUR),
  (UUID(), NULL,          'demo-session', 'groq',    'llama-3.3-70b-versatile', NOW()-INTERVAL 1  HOUR, NOW()-INTERVAL 1  HOUR, 245,  110,  310, 420, 'success', 'Write a regex for email validation',       'Here is a robust email regex pattern...',      440,  1240, NOW()-INTERVAL 1  HOUR),
  (UUID(), NULL,          'demo-session', 'openai',  'gpt-4o',                  NOW()-INTERVAL 30 MINUTE, NOW()-INTERVAL 30 MINUTE, 930, 190, 510, 700, 'success', 'Explain JWT authentication flow', 'JWT (JSON Web Tokens) work by...', 760, 2040, NOW()-INTERVAL 30 MINUTE),
  (UUID(), NULL,          'demo-session', 'gemini',  'gemini-1.5-flash',        NOW()-INTERVAL 10 MINUTE, NOW()-INTERVAL 10 MINUTE, 600, 140, 380, 520, 'success', 'What are LLM hallucinations?', 'Hallucinations in LLMs occur when...', 560, 1520, NOW()-INTERVAL 10 MINUTE);