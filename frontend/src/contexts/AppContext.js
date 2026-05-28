import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

const AppContext = createContext(null);

const initialState = {
  sessionId: uuidv4(),
  conversations: [],
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  streamingMessageId: null,
  sidebarOpen: true,
  activeView: 'chat',
  // Default to groq — the backend will also auto-fallback to groq if openai/gemini
  // are requested but not configured. App.js calls /api/providers/default on startup
  // and overwrites these with whatever is actually available.
  provider: 'groq',
  model: 'llama-3.3-70b-versatile',
  providers: [
    { id: 'openai',  name: 'OpenAI',         models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o'],                                   color: '#10a37f' },
    { id: 'gemini',  name: 'Google Gemini',   models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],              color: '#4285f4' },
    { id: 'groq',    name: 'Groq',            models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'], color: '#f55036' },
  ],
};

function reducer(state, action) {
  switch (action.type) {

    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };

    case 'ADD_CONVERSATION':
      if (state.conversations.some(c => c.id === action.payload.id)) return state;
      return {
        ...state,
        conversations: [action.payload, ...state.conversations],
        activeConversationId: action.payload.id,
      };

    case 'ADD_CONVERSATION_IF_MISSING':
      if (state.conversations.some(c => c.id === action.payload.id)) return state;
      return { ...state, conversations: [action.payload, ...state.conversations] };

    case 'UPDATE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.id === action.payload.id ? { ...c, ...action.payload } : c
        ),
      };

    case 'DELETE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.filter(c => c.id !== action.payload),
        activeConversationId:
          state.activeConversationId === action.payload ? null : state.activeConversationId,
        messages:
          state.activeConversationId === action.payload ? [] : state.messages,
      };

    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversationId: action.payload };

    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(m =>
          m.id === action.payload.id ? { ...m, ...action.payload } : m
        ),
      };

    case 'SET_STREAMING':
      return {
        ...state,
        isStreaming: action.payload.streaming,
        streamingMessageId: action.payload.messageId || null,
      };

    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };

    case 'SET_VIEW':
      return { ...state, activeView: action.payload };

    case 'SET_PROVIDER':
      return { ...state, provider: action.payload.provider, model: action.payload.model };

    // Mark providers as available/unavailable based on backend response
    case 'SET_PROVIDER_AVAILABILITY':
      return {
        ...state,
        providers: state.providers.map(p => ({
          ...p,
          available: action.payload[p.id] !== false,
        })),
      };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = {
    setConversations:          useCallback(data  => dispatch({ type: 'SET_CONVERSATIONS',           payload: data }),  []),
    addConversation:           useCallback(conv  => dispatch({ type: 'ADD_CONVERSATION',             payload: conv }),  []),
    addConversationIfMissing:  useCallback(conv  => dispatch({ type: 'ADD_CONVERSATION_IF_MISSING',  payload: conv }),  []),
    updateConversation:        useCallback(conv  => dispatch({ type: 'UPDATE_CONVERSATION',          payload: conv }),  []),
    deleteConversation:        useCallback(id    => dispatch({ type: 'DELETE_CONVERSATION',          payload: id }),    []),
    setActiveConversation:     useCallback(id    => dispatch({ type: 'SET_ACTIVE_CONVERSATION',      payload: id }),    []),
    setMessages:               useCallback(msgs  => dispatch({ type: 'SET_MESSAGES',                 payload: msgs }),  []),
    addMessage:                useCallback(msg   => dispatch({ type: 'ADD_MESSAGE',                  payload: msg }),   []),
    updateMessage:             useCallback(msg   => dispatch({ type: 'UPDATE_MESSAGE',               payload: msg }),   []),
    setStreaming:               useCallback((streaming, messageId) =>
                                 dispatch({ type: 'SET_STREAMING', payload: { streaming, messageId } }), []),
    toggleSidebar:             useCallback(()    => dispatch({ type: 'TOGGLE_SIDEBAR' }),                              []),
    setView:                   useCallback(view  => dispatch({ type: 'SET_VIEW',                     payload: view }),  []),
    setProvider:               useCallback((provider, model) =>
                                 dispatch({ type: 'SET_PROVIDER', payload: { provider, model } }),                     []),
    setProviderAvailability:   useCallback(map   => dispatch({ type: 'SET_PROVIDER_AVAILABILITY',    payload: map }),   []),
  };

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};