import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ── REST APIs ────────────────────────────────────────────────────

export const conversationApi = {
  list:        ()         => api.get('/conversations'),
  get:         (id)       => api.get(`/conversations/${id}`),
  create:      (data)     => api.post('/conversations', data),
  update:      (id, data) => api.put(`/conversations/${id}`, data),
  delete:      (id)       => api.delete(`/conversations/${id}`),
  getMessages: (id)       => api.get(`/conversations/${id}/messages`),
};

export const providerApi = {
  list:      ()         => api.get('/providers'),
  getModels: (provider) => api.get(`/providers/${provider}/models`),
};

export const analyticsApi = {
  summary:           (params) => api.get('/analytics/summary',    { params }),
  latency:           (params) => api.get('/analytics/latency',    { params }),
  tokenUsage:        (params) => api.get('/analytics/tokens',     { params }),
  providerBreakdown: (params) => api.get('/analytics/providers',  { params }),
  throughput:        (params) => api.get('/analytics/throughput', { params }),
  errorRate:         (params) => api.get('/analytics/errors',     { params }),
  logs:              (params) => api.get('/analytics/logs',       { params }),
};

// ── SSE Streaming ────────────────────────────────────────────────
//
// SSE protocol from backend:
//   data: {"type":"meta","conversationId":"..."}   ← first frame
//   data: {"type":"chunk","content":"Hello"}        ← one per token
//   data: {"type":"chunk","content":" world"}
//   ...
//   data: {"type":"error","error":"..."}            ← on failure
//   data: [DONE]                                    ← stream complete
//
// The frontend ONLY calls onDone when it sees [DONE].
// No other frame triggers stream completion.
export const createStreamingChat = ({
  conversationId,
  message,
  provider,
  model,
  sessionId,
  onChunk,
  onDone,
  onError,
}) => {
  const params = new URLSearchParams();
  if (conversationId) params.set('conversationId', conversationId);
  params.set('provider', provider || 'groq');
  params.set('model',    model    || 'llama-3.3-70b-versatile');
  if (sessionId) params.set('sessionId', sessionId);

  const url = `${BASE_URL}/chat/stream?${params}`;
  const controller = new AbortController();
  let finished = false;

  const finish = (fn) => {
    if (!finished) {
      finished = true;
      fn();
    }
  };

  const fetchStream = async () => {
    try {
      const response = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message }),
        signal:  controller.signal,
      });

      if (!response.ok) {
        let errMsg = `Server error ${response.status}`;
        try { const j = await response.json(); errMsg = j.error || errMsg; } catch {}
        finish(() => onError(errMsg));
        return;
      }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Stream closed by server — treat remaining buffer
          if (buffer.trim()) parseLine(buffer.trim(), onChunk, onError);
          finish(onDone);
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // SSE lines end with \n; events separated by \n\n
        // Split on every \n and keep the last (potentially incomplete) fragment
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const stop = parseLine(line.trim(), onChunk, onError);
          if (stop) {
            // [DONE] received — call onDone and exit cleanly
            finish(onDone);
            return;
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        finish(() => onError(err.message || 'Stream connection failed'));
      }
    }
  };

  fetchStream();
  return () => { finished = true; controller.abort(); };
};

/**
 * Parse one SSE line.
 * Returns true  → caller should stop reading ([DONE] received)
 * Returns false → keep reading
 */
function parseLine(line, onChunk, onError) {
  // SSE data lines start with "data: "
  if (!line.startsWith('data:')) return false;

  // Strip the "data:" prefix (handle both "data: " and "data:")
  const raw = line.replace(/^data:\s*/, '').trim();
  if (!raw) return false;

  // ── [DONE] — hard stop marker ──────────────────────────────────
  if (raw === '[DONE]') return true;

  // ── JSON frame ────────────────────────────────────────────────
  try {
    const frame = JSON.parse(raw);

    switch (frame.type) {

      case 'chunk':
        // Content token — pass to accumulator
        if (frame.content) onChunk(frame);
        return false;

      case 'meta':
        // Conversation metadata — pass to handler (no content)
        onChunk(frame);
        return false;

      case 'error':
        onError(frame.error || 'Unknown stream error');
        return true; // stop reading

      // Ignore any other frame types — do NOT call onDone here.
      // onDone is triggered ONLY by the [DONE] text above.
      default:
        return false;
    }
  } catch {
    // Not valid JSON — SSE comment or keep-alive, ignore
    return false;
  }
}

export default api;