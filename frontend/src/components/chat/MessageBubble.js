import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, User, Zap } from 'lucide-react';
import { format } from 'date-fns';

export default function MessageBubble({ message, isLast }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        marginBottom: 24,
        alignItems: 'flex-start',
        animation: 'fadeIn 0.2s ease',
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 32, height: 32,
        borderRadius: isUser ? 10 : '50%',
        background: isUser
          ? 'linear-gradient(135deg, #1e3a5f, #0d2240)'
          : 'linear-gradient(135deg, var(--accent-primary), #0099cc)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        border: isUser
          ? '1px solid rgba(30, 58, 95, 0.8)'
          : '1px solid rgba(0, 212, 255, 0.3)',
        boxShadow: !isUser ? '0 0 12px rgba(0, 212, 255, 0.25)' : 'none',
        marginTop: 2,
      }}>
        {isUser ? (
          <User size={14} color="#7aa8d4" />
        ) : (
          <Zap size={13} color="#fff" fill="#fff" />
        )}
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        maxWidth: isUser ? '75%' : '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}>
        <div style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          marginBottom: 6,
          fontWeight: 500,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {isUser ? 'You' : 'Assistant'}
          {message.createdAt && (
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
              {format(new Date(message.createdAt), 'HH:mm')}
            </span>
          )}
        </div>

        <div style={{
          background: isUser
            ? 'linear-gradient(135deg, var(--bg-active), var(--bg-muted))'
            : 'var(--bg-elevated)',
          border: `1px solid ${isUser ? 'var(--border-default)' : 'var(--border-subtle)'}`,
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          padding: '12px 16px',
          position: 'relative',
          boxShadow: 'var(--shadow-sm)',
          minWidth: 48,
          maxWidth: '100%',
        }}>
          {message.streaming && !message.content ? (
            <TypingDots />
          ) : (
            <div
              className={`message-content ${message.streaming ? 'stream-cursor' : ''}`}
              style={{
                fontSize: '14px',
                lineHeight: 1.7,
                color: message.error ? 'var(--error)' : 'var(--text-primary)',
              }}
            >
              {isUser ? (
                <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              )}
            </div>
          )}
        </div>

        {/* Copy button for assistant messages */}
        {!isUser && message.content && !message.streaming && (
          <button
            onClick={handleCopy}
            style={{
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '11px',
              borderRadius: 4,
              transition: 'color 0.15s',
              fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
          </button>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--accent-primary)',
          animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
          opacity: 0.6,
        }} />
      ))}
    </div>
  );
}