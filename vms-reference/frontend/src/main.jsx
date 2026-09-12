import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Toaster } from 'react-hot-toast';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import { queryClient } from './lib/queryClient.js';
import { queryPersister } from './lib/persist.js';
import { AuthProvider } from './context/AuthContext.jsx';
import { initSync } from './offline/sync.js';
import './index.css';
 
// Auto-update the installed app in place when a new version is deployed
// (no uninstall needed). Reloads once the new service worker is ready.
registerSW({ immediate: true });
 
// Start offline queue + online/offline sync engine
initSync();
 
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister, maxAge: 24 * 60 * 60 * 1000 }}
    >
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'text-sm',
              success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  </React.StrictMode>
);
