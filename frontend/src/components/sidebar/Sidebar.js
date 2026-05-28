import React, { useState } from 'react';
import {
  Plus, Trash2, MessageSquare, Search, MoreHorizontal, Edit3, Check, X
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { conversationApi } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';

export default function Sidebar() {
  const { state, actions } = useApp();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [hoveredId, setHoveredId] = useState(null);

  const filtered = state.conversations.filter((c) =>
    c.title?.toLowerCase().includes(search.toLowerCase())
  );

  const handleNewChat = async () => {
    try {
      const res = await conversationApi.create({
        title: 'New Conversation',
        provider: state.provider,
        model: state.model,
        sessionId: state.sessionId,
      });
      actions.addConversation(res.data);
      actions.setMessages([]);
    } catch {
      // optimistic fallback
      const tempConv = {
        id: `temp-${Date.now()}`,
        title: 'New Conversation',
        provider: state.provider,
        model: state.model,
        createdAt: new Date().toISOString(),
        messageCount: 0,
      };
      actions.addConversation(tempConv);
    }
  };

  const handleSelectConversation = async (conv) => {
    actions.setActiveConversation(conv.id);
    try {
      const res = await conversationApi.getMessages(conv.id);
      actions.setMessages(res.data);
    } catch {
      actions.setMessages([]);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await conversationApi.delete(id);
    } catch {}
    actions.deleteConversation(id);
  };

  const handleEditSave = async (e, id) => {
    e.stopPropagation();
    try {
      await conversationApi.update(id, { title: editTitle });
      actions.updateConversation({ id, title: editTitle });
    } catch {}
    setEditingId(null);
  };

  if (!state.sidebarOpen) return null;

  return (
    <aside style={{
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      width: 'var(--sidebar-width)',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 20,
      animation: 'slideInLeft 0.2s ease',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 12px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingLeft: 4 }}>
          <div style={{
            width: 28, height: 28,
            background: 'linear-gradient(135deg, var(--accent-primary), #0066aa)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '-0.01em' }}>NeuralLog</span>
        </div>

        <button
          onClick={handleNewChat}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px',
            background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(0,153,204,0.08))',
            border: '1px solid rgba(0,212,255,0.25)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--accent-primary)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'all 0.2s',
            fontFamily: 'var(--font-body)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,153,204,0.14))'}
          onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(0,153,204,0.08))'}
        >
          <Plus size={15} />
          New conversation
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '0 12px 10px', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            style={{
              width: '100%',
              padding: '7px 10px 7px 30px',
              background: 'var(--bg-muted)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              outline: 'none',
              fontFamily: 'var(--font-body)',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--border-default)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
          />
        </div>
      </div>

      {/* Conversations list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '12.5px',
          }}>
            <MessageSquare size={28} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <div>No conversations yet</div>
            <div style={{ marginTop: 4, fontSize: '11.5px' }}>Start a new chat above</div>
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              isActive={conv.id === state.activeConversationId}
              isEditing={editingId === conv.id}
              editTitle={editTitle}
              hovered={hoveredId === conv.id}
              onSelect={() => handleSelectConversation(conv)}
              onDelete={(e) => handleDelete(e, conv.id)}
              onStartEdit={(e) => {
                e.stopPropagation();
                setEditingId(conv.id);
                setEditTitle(conv.title);
              }}
              onEditSave={(e) => handleEditSave(e, conv.id)}
              onEditCancel={(e) => { e.stopPropagation(); setEditingId(null); }}
              onEditChange={setEditTitle}
              onHover={setHoveredId}
            />
          ))
        )}
      </div>

      {/* Provider selector */}
      <ProviderSelector />
    </aside>
  );
}

function ConversationItem({
  conv, isActive, isEditing, editTitle, hovered,
  onSelect, onDelete, onStartEdit, onEditSave, onEditCancel, onEditChange, onHover
}) {
  const providerColor = { openai: '#10a37f', gemini: '#4285f4', groq: '#f55036' };

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => onHover(conv.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '9px 10px',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        background: isActive ? 'var(--bg-active)' : hovered ? 'var(--bg-hover)' : 'transparent',
        border: isActive ? '1px solid var(--border-default)' : '1px solid transparent',
        marginBottom: 2,
        transition: 'all 0.15s',
        position: 'relative',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: isActive ? 'var(--bg-muted)' : 'var(--bg-elevated)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        border: '1px solid var(--border-subtle)',
      }}>
        <MessageSquare size={12} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {isEditing ? (
          <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
            <input
              value={editTitle}
              onChange={e => onEditChange(e.target.value)}
              autoFocus
              style={{
                flex: 1, background: 'var(--bg-muted)', border: '1px solid var(--border-default)',
                borderRadius: 4, padding: '2px 6px', color: 'var(--text-primary)',
                fontSize: '12px', fontFamily: 'var(--font-body)', outline: 'none',
              }}
              onKeyDown={e => { if (e.key === 'Enter') onEditSave(e); if (e.key === 'Escape') onEditCancel(e); }}
            />
            <button onClick={onEditSave} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success)', padding: '2px' }}><Check size={12} /></button>
            <button onClick={onEditCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}><X size={12} /></button>
          </div>
        ) : (
          <>
            <div style={{
              fontSize: '12.5px', fontWeight: 500,
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{conv.title || 'Untitled'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              {conv.provider && (
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: providerColor[conv.provider] || '#666',
                }} />
              )}
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {conv.messageCount || 0} msgs
              </span>
              {conv.updatedAt && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  · {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {(hovered || isActive) && !isEditing && (
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button
            onClick={onStartEdit}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '3px', borderRadius: 4 }}
            onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
          ><Edit3 size={12} /></button>
          <button
            onClick={onDelete}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '3px', borderRadius: 4 }}
            onMouseEnter={e => e.target.style.color = 'var(--error)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
          ><Trash2 size={12} /></button>
        </div>
      )}
    </div>
  );
}

function ProviderSelector() {
  const { state, actions } = useApp();
  const [open, setOpen] = useState(false);

  const current = state.providers.find(p => p.id === state.provider);
  const isCurrentAvailable = current?.available !== false;

  return (
    <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        LLM Provider
      </div>
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px',
            background: 'var(--bg-muted)',
            border: `1px solid ${isCurrentAvailable ? 'var(--border-default)' : 'rgba(255,77,106,0.3)'}`,
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer', color: 'var(--text-primary)',
            fontSize: '12.5px', fontFamily: 'var(--font-body)',
            transition: 'all 0.15s',
          }}
        >
          {/* Dot: glowing if available, grey if not */}
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isCurrentAvailable ? current?.color : '#444',
            boxShadow: isCurrentAvailable ? `0 0 6px ${current?.color}80` : 'none',
            flexShrink: 0,
          }} />
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 500 }}>{current?.name}</div>
            <div style={{ fontSize: '11px', color: isCurrentAvailable ? 'var(--text-muted)' : 'var(--error)', opacity: 0.8 }}>
              {isCurrentAvailable ? state.model : 'No API key set'}
            </div>
          </div>
          <MoreHorizontal size={13} color="var(--text-muted)" />
        </button>

        {open && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 0, right: 0,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 4, overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)',
            animation: 'fadeIn 0.15s ease',
            zIndex: 100,
          }}>
            {state.providers.map(p => {
              const available = p.available !== false;
              return (
                <div key={p.id}>
                  {/* Provider header row */}
                  <div style={{
                    padding: '6px 10px 4px',
                    fontSize: '10.5px',
                    color: available ? 'var(--text-muted)' : '#444',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: available ? p.color : '#333',
                    }} />
                    {p.name}
                    {!available && (
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: '9px', fontWeight: 600,
                        color: '#555',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid #333',
                        borderRadius: 3,
                        padding: '1px 5px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}>No key</span>
                    )}
                  </div>

                  {/* Model rows */}
                  {p.models.map(m => {
                    const isSelected = state.provider === p.id && state.model === m;
                    return (
                      <button
                        key={m}
                        onClick={() => {
                          // Allow selecting any provider — backend auto-routes
                          actions.setProvider(p.id, m);
                          setOpen(false);
                        }}
                        style={{
                          width: '100%', display: 'block',
                          padding: '6px 10px 6px 22px',
                          background: isSelected ? 'var(--bg-hover)' : 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: !available ? '#444' : isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontSize: '12px', textAlign: 'left',
                          fontFamily: 'var(--font-body)',
                          transition: 'all 0.1s',
                          opacity: available ? 1 : 0.45,
                        }}
                        onMouseEnter={e => { if (available) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'var(--bg-hover)' : 'none'; }}
                        title={!available ? `${p.name} has no API key configured` : ''}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {/* Footer hint */}
            <div style={{
              padding: '6px 10px 8px',
              fontSize: '10.5px',
              color: '#3a4a5a',
              borderTop: '1px solid var(--border-subtle)',
              marginTop: 2,
            }}>
              Add keys in application.properties to enable providers
            </div>
          </div>
        )}
      </div>
    </div>
  );
}