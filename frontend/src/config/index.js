import React from 'react';
import { createRoot } from 'react-dom/client'; // Import createRoot instead
import './index.css';
import App from '../App';
//import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// Create a root
const root = createRoot(document.getElementById('root'));

// Render using the root
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
// src/config/index.js
const config = {
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8080',
  BASE_URL: process.env.REACT_APP_BASE_URL || 'http://localhost:8080',
  FRONTEND_URL: process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000',
  AUTH: {
    TOKEN_KEY: 'token',
    USER_KEY: 'user',
    REMEMBER_ME_KEY: 'rememberMe'
  }
};

export default config;
// Register service worker
//serviceWorkerRegistration.register();