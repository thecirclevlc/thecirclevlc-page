import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './AppRouter';
import { EditModeProvider } from './contexts/EditModeContext';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <EditModeProvider>
        <AppRouter />
      </EditModeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
