// src/config/index.js
// This is what your config file should look like

const getApiUrl = () => {
  return process.env.REACT_APP_API_URL || 'http://localhost:8080';
};

const getBaseUrl = () => {
  return process.env.REACT_APP_BASE_URL || 'http://localhost:8080';
};

const config = {
  API_URL: getApiUrl(),
  BASE_URL: getBaseUrl(),
  ENV: process.env.REACT_APP_ENV || 'development',
  
  // IMPORTANT: Make sure this AUTH object exists
  AUTH: {
    TOKEN_KEY: 'token',
    USER_KEY: 'user',
    REMEMBER_ME_KEY: 'rememberMe'
  }
};

console.log('Config loaded:', {
  API_URL: config.API_URL,
  BASE_URL: config.BASE_URL,
  ENV: config.ENV,
  AUTH: config.AUTH ? 'defined' : 'undefined'
});

export default config;