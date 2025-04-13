import axios from 'axios';
import config from '../config';

// Default auth keys in case config is not loaded properly
const DEFAULT_AUTH_KEYS = {
  TOKEN_KEY: 'token',
  USER_KEY: 'user',
  REMEMBER_ME_KEY: 'rememberMe'
};

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: config.API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor for authentication
axiosInstance.interceptors.request.use(
  (config) => {
    const authKeys = config.AUTH || DEFAULT_AUTH_KEYS;
    const token = localStorage.getItem(authKeys.TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized access
      const authKeys = config.AUTH || DEFAULT_AUTH_KEYS;
      localStorage.removeItem(authKeys.TOKEN_KEY);
      localStorage.removeItem(authKeys.USER_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance; 