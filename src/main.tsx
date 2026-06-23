import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClientProvider} from '@tanstack/react-query';
import App from './App.tsx';
import {PasswordGate} from './components/PasswordGate.tsx';
import {TenantProvider} from './contexts/TenantContext.tsx';
import {queryClient} from './lib/queryClient';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TenantProvider>
      <PasswordGate>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </PasswordGate>
    </TenantProvider>
  </StrictMode>,
);
