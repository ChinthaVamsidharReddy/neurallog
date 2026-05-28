import React from 'react';
import { PanelLeft, BarChart3, MessageSquare, Zap } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export default function Header() {
  const { state, actions } = useApp();

  return (
    <header style={{
      height: 'var(--header-height)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-surface)',
      backdropFilter: 'blur(12px)',
      flexShrink: 0,
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={actions.toggleSidebar}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { e.target.style.color = 'var(--text-primary)'; e.target.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { e.target.style.color = 'var(--text-secondary)'; e.target.style.background = 'none'; }}
        >
          <PanelLeft size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28,
            background: 'linear-gradient(135deg, var(--accent-primary), #0066aa)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)',
          }}>
            <Zap size={14} color="#fff" fill="#fff" />
          </div>
          <span style={{
            fontWeight: 600,
            fontSize: '15px',
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}>NeuralLog</span>
        </div>
      </div>

      <nav style={{ display: 'flex', gap: 4 }}>
        {[
          { view: 'chat', icon: <MessageSquare size={15} />, label: 'Chat' },
          { view: 'analytics', icon: <BarChart3 size={15} />, label: 'Analytics' },
        ].map(({ view, icon, label }) => (
          <button
            key={view}
            onClick={() => actions.setView(view)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: state.activeView === view ? '1px solid var(--border-default)' : '1px solid transparent',
              background: state.activeView === view ? 'var(--bg-muted)' : 'none',
              color: state.activeView === view ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: state.activeView === view ? 500 : 400,
              transition: 'all 0.15s',
              fontFamily: 'var(--font-body)',
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {state.provider && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-muted)',
            border: '1px solid var(--border-subtle)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: state.provider === 'openai' ? '#10a37f'
                : state.provider === 'gemini' ? '#4285f4' : '#f55036',
              boxShadow: '0 0 6px currentColor',
            }} />
            {state.model}
          </div>
        )}
      </div>
    </header>
  );
}