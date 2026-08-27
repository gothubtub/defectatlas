import React from 'react';
import { createRoot } from 'react-dom/client';
import { AtlasProvider } from './state/AtlasContext';
import App from './App';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AtlasProvider>
      <App />
    </AtlasProvider>
  </React.StrictMode>
);
