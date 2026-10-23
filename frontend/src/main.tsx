import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import 'remixicon/fonts/remixicon.css';
import './index.css';
import App from '@/App';
import AuthProvider from '@/context/AuthProvider';
import ThemeProvider from '@/context/ThemeProvider';
import useTheme from '@/hooks/useTheme';
import { queryClient } from '@/lib/queryClient';

function ThemedToaster() {
  const { isDark } = useTheme();

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: isDark
          ? {
              background: '#131c2e',
              color: '#f8fafc',
              border: '1px solid #1e293b',
              borderRadius: '14px',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
              fontSize: '14px',
            }
          : {
              background: '#ffffff',
              color: '#1f2a37',
              border: '1px solid #e6e8eb',
              borderRadius: '14px',
              boxShadow: '0 12px 32px rgba(16, 24, 40, 0.16)',
              fontSize: '14px',
            },
        success: {
          iconTheme: {
            primary: isDark ? '#10b981' : '#2d6a4f',
            secondary: isDark ? '#131c2e' : '#ffffff',
          },
        },
        error: {
          iconTheme: {
            primary: isDark ? '#f43f5e' : '#c0392b',
            secondary: isDark ? '#131c2e' : '#ffffff',
          },
        },
      }}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {/* AuthProvider usa useQueryClient, por eso va dentro del QueryClientProvider. */}
        <AuthProvider>
          <App />
        </AuthProvider>
        <ThemedToaster />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
