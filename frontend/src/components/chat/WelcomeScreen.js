import React from 'react';
import { Zap, Code, BookOpen, Globe, Lightbulb, FileText } from 'lucide-react';

const PROMPTS = [
  { icon: <Code size={16} />, text: 'Write a Python function to parse JSON and handle errors gracefully', category: 'Code' },
  { icon: <Lightbulb size={16} />, text: 'Explain the difference between REST and GraphQL APIs', category: 'Concepts' },
  { icon: <FileText size={16} />, text: 'Write a professional email to request a project deadline extension', category: 'Writing' },
  { icon: <Globe size={16} />, text: 'What are the latest trends in AI and machine learning?', category: 'Research' },
  { icon: <BookOpen size={16} />, text: 'Summarize the key principles of clean code architecture', category: 'Learning' },
  { icon: <Code size={16} />, text: 'Debug this React component: state not updating after async call', category: 'Debug' },
];

export default function WelcomeScreen({ onPromptSelect }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      overflowY: 'auto',
    }}>
      {/* Logo area */}
      <div style={{ textAlign: 'center', marginBottom: 48, animation: 'fadeIn 0.4s ease' }}>
        <div style={{
          width: 64, height: 64,
          background: 'linear-gradient(135deg, var(--accent-primary), #0066aa)',
          borderRadius: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 0 40px rgba(0, 212, 255, 0.3)',
        }}>
          <Zap size={28} color="#fff" fill="#fff" />
        </div>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 600,
          letterSpacing: '-0.04em',
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}>
          How can I help you today?
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px' }}>
          Powered by GPT-4.1, Gemini, and Groq — with full inference logging
        </p>
      </div>

      {/* Prompt suggestions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 10,
        width: '100%',
        maxWidth: 640,
        animation: 'fadeIn 0.5s ease',
      }}>
        {PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => onPromptSelect(p.text)}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
              animationDelay: `${i * 0.05}s`,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--bg-hover)';
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--bg-elevated)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
              }}>{p.icon}</div>
              <span style={{
                fontSize: '10.5px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}>{p.category}</span>
            </div>
            <span style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>{p.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}