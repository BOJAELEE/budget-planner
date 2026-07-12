import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { RepositoryProvider } from './data/RepositoryContext';
import { SupabaseRepository } from './data/supabaseRepository';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RepositoryProvider repo={new SupabaseRepository()}>
      <App />
    </RepositoryProvider>
  </React.StrictMode>,
);
