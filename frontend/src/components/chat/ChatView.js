import React, { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp } from '../../contexts/AppContext';
import { conversationApi, createStreamingChat } from '../../services/api';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import WelcomeScreen from './WelcomeScreen';

export default function ChatView() {
  const { state, actions } = useApp();
  const cancelStreamRef   = useRef(null);
  const accumulatedRef    = useRef('');   // ← ref, NOT a local let — survives re-renders
  const assistantMsgIdRef = useRef(null); // ← ref so onDone closure always has latest id
  const [error, setError] = useState(null);

  useEffect(() => {
    return () => { if (cancelStreamRef.current) cancelStreamRef.current(); };
  }, []);

  const handleSendMessage = async (content) => {
    if (!content.trim() || state.isStreaming) return;
    setError(null);

    // ── 1. Resolve / create conversation ────────────────────────────
    let convId = state.activeConversationId;
    if (!convId) {
      try {
        const res = await conversationApi.create({
          title:     content.substring(0, 60),
          provider:  state.provider,
          model:     state.model,
          sessionId: state.sessionId,
        });
        convId = res.data.id;
        actions.setActiveConversation(convId);
        actions.addConversation(res.data);
      } catch {
        convId = null; // backend will create it; we pick up id from meta frame
      }
    }

    // ── 2. Add user bubble ───────────────────────────────────────────
    const userMsgId = uuidv4();
    actions.addMessage({
      id: userMsgId, conversationId: convId || 'pending',
      role: 'user', content, createdAt: new Date().toISOString(),
    });

    // ── 3. Add empty assistant placeholder ──────────────────────────
    const assistantMsgId = uuidv4();
    assistantMsgIdRef.current = assistantMsgId;
    accumulatedRef.current    = '';          // reset accumulator

    actions.addMessage({
      id: assistantMsgId, conversationId: convId || 'pending',
      role: 'assistant', content: '', streaming: true,
      createdAt: new Date().toISOString(),
    });
    actions.setStreaming(true, assistantMsgId);

    // ── 4. Start SSE stream ──────────────────────────────────────────
    cancelStreamRef.current = createStreamingChat({
      conversationId: convId,
      message:        content,
      provider:       state.provider,
      model:          state.model,
      sessionId:      state.sessionId,

      onChunk: (frame) => {
        if (frame.type === 'meta') {
          // Backend created conversation — sync its real id into state
          if (frame.conversationId && frame.conversationId !== convId) {
            const realId = frame.conversationId;
            convId = realId;
            actions.setActiveConversation(realId);
            actions.updateMessage({ id: userMsgId,      conversationId: realId });
            actions.updateMessage({ id: assistantMsgId, conversationId: realId });
            actions.addConversationIfMissing({
              id: realId, title: content.substring(0, 60),
              provider: state.provider, model: state.model,
              createdAt: new Date().toISOString(), messageCount: 0,
            });
          }
          return;
        }

        if (frame.type === 'chunk' && frame.content) {
          accumulatedRef.current += frame.content;
          // Update the assistant bubble with every new token
          actions.updateMessage({
            id:        assistantMsgId,
            content:   accumulatedRef.current,
            streaming: true,
          });
        }
      },

      onDone: () => {
        // accumulatedRef.current is always up-to-date — no stale closure issue
        const finalContent = accumulatedRef.current;
        actions.updateMessage({
          id:        assistantMsgIdRef.current,
          content:   finalContent,
          streaming: false,
        });
        actions.setStreaming(false, null);
        if (convId) {
          actions.updateConversation({
            id: convId, updatedAt: new Date().toISOString(),
          });
        }
        cancelStreamRef.current = null;
      },

      onError: (err) => {
        const msg = err || 'Stream failed. Check your API key in application.properties.';
        setError(msg);
        actions.updateMessage({
          id:        assistantMsgIdRef.current,
          content:   accumulatedRef.current || '⚠ No response received. Please try again.',
          streaming: false,
          error:     true,
        });
        actions.setStreaming(false, null);
        cancelStreamRef.current = null;
      },
    });
  };

  const handleCancelStream = () => {
    if (cancelStreamRef.current) { cancelStreamRef.current(); cancelStreamRef.current = null; }
    if (state.streamingMessageId) {
      actions.updateMessage({ id: state.streamingMessageId, streaming: false });
    }
    actions.setStreaming(false, null);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-base)' }}>
      {state.messages.length > 0
        ? <MessageList messages={state.messages} />
        : <WelcomeScreen onPromptSelect={handleSendMessage} />
      }

      {error && (
        <div
          onClick={() => setError(null)}
          style={{
            margin: '0 auto 8px', padding: '8px 20px', maxWidth: 640,
            background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.3)',
            borderRadius: 'var(--radius-md)', color: 'var(--error)',
            fontSize: '12.5px', cursor: 'pointer', animation: 'fadeIn 0.2s ease',
          }}
        >
          ⚠ {error} <span style={{ opacity: 0.5, marginLeft: 8 }}>✕</span>
        </div>
      )}

      <ChatInput
        onSend={handleSendMessage}
        onCancel={handleCancelStream}
        isStreaming={state.isStreaming}
        disabled={false}
      />
    </div>
  );
}