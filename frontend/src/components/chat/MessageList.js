import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

export default function MessageList({ messages }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const streamingMsg = messages.find(m => m.streaming && m.content === '');

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '24px 0',
    }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLast={idx === messages.length - 1}
          />
        ))}

        {streamingMsg && <TypingIndicator />}
        <div ref={bottomRef} style={{ height: 1 }} />
      </div>
    </div>
  );
}