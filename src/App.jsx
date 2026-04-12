import React from 'react';
import { Toaster } from './components/ui/toaster'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from './lib/query-client'
import AppLayout from './layouts/AppLayout';

export default function App() {
  return <AppLayout />;
}
