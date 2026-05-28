import React, { useEffect } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import Layout from './components/layout/Layout';
import ChatView from './components/chat/ChatView';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';
import { conversationApi } from './services/api';

function AppContent() {
  const { state, actions } = useApp();

  useEffect(() => {
    conversationApi.list()
      .then(r => actions.setConversations(r.data))
      .catch(() => actions.setConversations([]));
  }, []);  // eslint-disable-line

  return (
    <Layout>
      {state.activeView === 'chat' ? <ChatView /> : <AnalyticsDashboard />}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}