import React from 'react';
import { useApp } from '../../contexts/AppContext';
import Sidebar from '../sidebar/Sidebar';
import Header from './Header';

export default function Layout({ children }) {
  const { state } = useApp();

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--bg-base)',
      overflow: 'hidden',
    }}>
      <Sidebar />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        marginLeft: state.sidebarOpen ? 'var(--sidebar-width)' : '0',
        transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <Header />
        <main style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}