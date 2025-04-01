// src/services/api.js
import axios from 'axios';
import config from '../config';

// Use environment variables with fallbacks, then config fallbacks
const API_URL = process.env.REACT_APP_API_URL || config?.API_URL || 'http://localhost:8080';
const BASE_URL = process.env.REACT_APP_BASE_URL || config?.BASE_URL || 'http://localhost:8080';
const ENV = process.env.REACT_APP_ENV || 'development';

// Log environment settings
console.log(`API Service initialized in ${ENV} environment`);
console.log(`API URL: ${API_URL}`);
console.log(`BASE URL: ${BASE_URL}`);

// Auth constants
const AUTH = config?.AUTH || { 
  TOKEN_KEY: 'token', 
  USER_KEY: 'user', 
  REMEMBER_ME_KEY: 'rememberMe' 
};

// Create axios instance - Make sure the baseURL doesn't duplicate /api if it's in the URL
const apiBaseUrl = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;
const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true
});

// Set auth token for future requests
const setAuthToken = (token) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log("API: Auth token set in headers");
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    console.log("API: Auth token removed from headers");
  }
};

// Add a response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      console.error('API: Authentication error - token might be invalid or expired');
      
      // Don't automatically logout if on login/register pages
      const path = window.location.pathname;
      if (!path.includes('/login') && !path.includes('/register') && !path.includes('/auth/')) {
        console.log('API: Redirecting to login due to auth error');
        localStorage.removeItem(AUTH.TOKEN_KEY);
        localStorage.removeItem(AUTH.USER_KEY);
        setAuthToken(null);
        // Redirect with a slight delay to allow for any state updates
        setTimeout(() => {
          window.location.href = '/login?expired=true';
        }, 100);
      }
    }
    
    return Promise.reject(error);
  }
);

// Authentication API calls
const authMethods = {
  // Register new user
  register: async (userData) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Registration Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Login with email and password
  login: async (credentials) => {
    try {
      console.log(`Login attempt to ${apiBaseUrl}/auth/login`);
      const response = await apiClient.post('/auth/login', credentials);
      
      // Set token in headers for future requests
      if (response.data && response.data.token) {
        localStorage.setItem(AUTH.TOKEN_KEY, response.data.token);
        setAuthToken(response.data.token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Login Error:', error);
      throw error;
    }
  },
  
  // Get authenticated user info
  getUser: async () => {
    try {
      const response = await apiClient.get('/auth/user');
      return response.data;
    } catch (error) {
      console.error('Get User Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Verify token validity
  verifyToken: async (token) => {
    try {
      const response = await apiClient.post('/auth/verify-token', { token });
      return response.data;
    } catch (error) {
      console.error('Token Verification Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Request password reset
  forgotPassword: async (email) => {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      console.error('Forgot Password Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Reset password with token
  resetPassword: async (token, password) => {
    try {
      const response = await apiClient.post(`/auth/reset-password/${token}`, { password });
      return response.data;
    } catch (error) {
      console.error('Reset Password Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Log out (client-side)
  logout: () => {
    localStorage.removeItem(AUTH.TOKEN_KEY);
    localStorage.removeItem(AUTH.USER_KEY);
    // Remove token from headers
    setAuthToken(null);
    // Redirect to login page
    window.location.href = '/login';
  },
  
  // Social login URLs - using URL from env vars
  socialLogin: {
    google: `${BASE_URL}/api/auth/google`,
    github: `${BASE_URL}/api/auth/github`
  },
  
  // Process OAuth callback
  processOAuthCallback: () => {
    console.log("API: Processing OAuth callback");
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');
    
    if (error) {
      console.error('API: OAuth Error:', decodeURIComponent(error));
      return null;
    }
    
    if (token) {
      console.log("API: OAuth token received, storing");
      localStorage.setItem(AUTH.TOKEN_KEY, token);
      setAuthToken(token);
      return token;
    }
    
    console.warn("API: No token found in OAuth callback");
    return null;
  }
};

// Receipt API calls
const receiptMethods = {
  // Upload single receipt
  uploadReceipt: async (formData) => {
    try {
      const response = await apiClient.post('/upload-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('Upload Receipt Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Upload multiple receipts
  uploadMultipleReceipts: async (formData) => {
    try {
      const response = await apiClient.post('/upload-multiple-receipts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('Upload Multiple Receipts Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Add manual receipt
  addManualReceipt: async (receiptData) => {
    try {
      const formData = new FormData();
      formData.append('manualReceiptData', JSON.stringify(receiptData));
      
      const response = await apiClient.post('/add-manual-receipt', formData);
      return response.data;
    } catch (error) {
      console.error('Add Manual Receipt Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Get all receipts
  getReceipts: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      const response = await apiClient.get(`/get-receipts${queryString}`);
      return response.data;
    } catch (error) {
      console.error('Get Receipts Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Delete a receipt
  deleteReceipt: async (id) => {
    try {
      const response = await apiClient.delete(`/delete-receipt/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete Receipt Error:', error.response?.data || error.message);
      throw error;
    }
  }
};

// Export API
const api = {
  setAuthToken,
  auth: authMethods,
  receipts: receiptMethods
};

// Initialize token after api object is fully defined
const storedToken = localStorage.getItem(AUTH.TOKEN_KEY);
if (storedToken) {
  setAuthToken(storedToken);
}

export default api;