// src/services/api.js
import axios from 'axios';
import config from '../config';

// Use config object for all environment-specific values
const API_URL = config.API_URL;
const BASE_URL = config.BASE_URL;
const AUTH_CONFIG = config.AUTH;

// Create axios instance with credentials
const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true // Enable sending cookies with requests
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

// Initialize with token from localStorage if it exists
const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
if (token) {
  setAuthToken(token);
  console.log("API: Initial auth token set from localStorage");
}

// Request interceptor to add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    // Handle specific error scenarios
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Token is invalid or expired
          localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
          localStorage.removeItem(AUTH_CONFIG.USER_KEY);
          // Only redirect if not already on login page
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          break;
        case 403:
          console.error('Forbidden: You do not have permission');
          break;
        case 404:
          console.error('Not Found');
          break;
        case 500:
          console.error('Server Error');
          break;
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network Error: No response received from server');
    }
    return Promise.reject(error);
  }
);

// Authentication API calls
const auth = {
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
      const response = await apiClient.post('/auth/login', credentials);
      
      // Set token in headers for future requests
      if (response.data && response.data.token) {
        localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, response.data.token);
        setAuthToken(response.data.token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Login Error:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      } else if (error.request) {
        console.error('No response received:', error.request);
      }
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
    localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
    localStorage.removeItem(AUTH_CONFIG.USER_KEY);
    // Remove token from headers
    setAuthToken(null);
    // Redirect to login page
    window.location.href = '/login';
  },
  
  // Social login URLs - Using config.BASE_URL
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
      localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token);
      setAuthToken(token);
      return token;
    }
    
    console.warn("API: No token found in OAuth callback");
    return null;
  }
};

// Receipt API calls
const receipts = {
  // Upload single receipt
  uploadReceipt: async (formData) => {
    try {
      // Use apiClient with API prefix for consistent routing
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
  auth,
  receipts
};

export default api;