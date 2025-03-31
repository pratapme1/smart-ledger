// src/services/api.js
import axios from 'axios';
import { AUTH_CONFIG } from '../config';

// Use environment variables or fallback to localhost
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
const BASE_URL = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:8080';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

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
      return response.data;
    } catch (error) {
      console.error('Login Error:', error.response?.data || error.message);
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
  },
  
  // Social login URLs
  socialLogin: {
    google: `${API_URL}/auth/google`,
    github: `${API_URL}/auth/github`
  },
  
  // Process OAuth callback
  processOAuthCallback: () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token');
  }
};

// Receipt API calls
const receipts = {
  // Upload single receipt
  uploadReceipt: async (formData) => {
    try {
      const response = await apiClient.post(`${BASE_URL}/upload-receipt`, formData, {
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
      const response = await apiClient.post(`${BASE_URL}/upload-multiple-receipts`, formData, {
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
      
      const response = await apiClient.post(`${BASE_URL}/add-manual-receipt`, formData);
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
      
      const response = await apiClient.get(`${BASE_URL}/get-receipts${queryString}`);
      return response.data;
    } catch (error) {
      console.error('Get Receipts Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Delete a receipt
  deleteReceipt: async (id) => {
    try {
      const response = await apiClient.delete(`${BASE_URL}/delete-receipt/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete Receipt Error:', error.response?.data || error.message);
      throw error;
    }
  }
};

// Export API
const api = {
  auth,
  receipts
};

export default api;