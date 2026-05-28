import React from 'react';

export default function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 14, marginBottom: 24, alignItems: 'flex-start', animation: 'fadeIn 0.2s ease' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--accent-primary), #0099cc)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 2,
        boxShadow: '0 0 12px rgba(0, 212, 255, 0.4)',
        animation: 'glow-pulse 2s ease-in-out infinite',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
      </div>
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '4px 16px 16px 16px',
        padding: '14px 18px',
      }}>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--accent-primary)',
              animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}