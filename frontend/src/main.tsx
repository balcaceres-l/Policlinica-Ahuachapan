import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import 'remixicon/fonts/remixicon.css';
import './index.css';
import App from '@/App';
import { queryClient } from '@/lib/queryClient';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#ffffff',
            color: '#1f2a37',
            border: '1px solid #e6e8eb',
            borderRadius: '14px',
            boxShadow: '0 12px 32px rgba(16, 24, 40, 0.16)',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#2d6a4f', secondary: '#ffffff' } },
          error: { iconTheme: { primary: '#c0392b', secondary: '#ffffff' } },
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
);
