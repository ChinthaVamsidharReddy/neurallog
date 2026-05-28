import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip } from 'lucide-react';

export default function ChatInput({ onSend, onCancel, isStreaming, disabled }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!isStreaming && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isStreaming]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const canSend = value.trim().length > 0 && !isStreaming && !disabled;

  return (
    <div style={{
      flexShrink: 0,
      padding: '12px 24px 20px',
      background: 'var(--bg-base)',
    }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
          boxShadow: 'var(--shadow-md)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
          onFocus={() => {}}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => { setValue(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? 'Generating response...' : 'Message NeuralLog... (Enter to send, Shift+Enter for newline)'}
            disabled={isStreaming}
            rows={1}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              resize: 'none',
              color: 'var(--text-primary)',
              fontSize: '14px',
              lineHeight: 1.6,
              fontFamily: 'var(--font-body)',
              maxHeight: 200,
              overflowY: 'auto',
              padding: 0,
              opacity: isStreaming ? 0.5 : 1,
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {isStreaming ? (
              <button
                onClick={onCancel}
                style={{
                  width: 36, height: 36,
                  background: 'rgba(255, 77, 106, 0.15)',
                  border: '1px solid rgba(255, 77, 106, 0.4)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                  animation: 'glow-pulse 2s ease-in-out infinite',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 77, 106, 0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 77, 106, 0.15)'; }}
              >
                <Square size={14} color="var(--error)" fill="var(--error)" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canSend}
                style={{
                  width: 36, height: 36,
                  background: canSend
                    ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
                    : 'var(--bg-muted)',
                  border: `1px solid ${canSend ? 'transparent' : 'var(--border-subtle)'}`,
                  borderRadius: 10,
                  cursor: canSend ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: canSend ? 'var(--shadow-glow)' : 'none',
                  transform: canSend ? 'scale(1)' : 'scale(0.95)',
                }}
              >
                <Send size={14} color={canSend ? '#fff' : 'var(--text-muted)'} />
              </button>
            )}
          </div>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: 8,
          fontSize: '11px',
          color: 'var(--text-muted)',
        }}>
          NeuralLog can make mistakes. Verify important information.
        </div>
      </div>
    </div>
  );
}