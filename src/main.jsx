import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { queryClientInstance } from './lib/query-client';
import { AuthProvider } from './contexts/AuthContext';

const root = createRoot(document.getElementById('root'));
root.render(
  <QueryClientProvider client={queryClientInstance}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
);
