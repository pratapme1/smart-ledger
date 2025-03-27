import React from 'react';
import { createRoot } from 'react-dom/client'; // Import createRoot instead
import './index.css';
import App from './App';
//import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// Create a root
const root = createRoot(document.getElementById('root'));

// Render using the root
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker
//serviceWorkerRegistration.register();