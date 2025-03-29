// src/services/api.js

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
const BASE_URL = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:8080';

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: 'An error occurred while processing your request'
    }));
    throw new Error(error.message || 'An error occurred');
  }
  
  return response.json();
};

// Authentication API calls
const auth = {
  // Register new user
  register: async (userData) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return handleResponse(response);
  },
  
  // Login with email and password
  login: async (credentials) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return handleResponse(response);
  },
  
  // Get authenticated user info
  getUser: async (token) => {
    const response = await fetch(`${API_URL}/auth/user`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },
  
  // Request password reset
  forgotPassword: async (email) => {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return handleResponse(response);
  },
  
  // Reset password with token
  resetPassword: async (token, password) => {
    const response = await fetch(`${API_URL}/auth/reset-password/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    return handleResponse(response);
  },
  
  // Social login URLs
  socialLogin: {
    google: `${API_URL}/auth/google`,
    github: `${API_URL}/auth/github`
  },
  
  // Process OAuth callback
  processOAuthCallback: () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    return token;
  }
};

// Receipt API calls
const receipts = {
  // Upload single receipt
  uploadReceipt: async (token, formData) => {
    const response = await fetch(`${BASE_URL}/upload-receipt`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData // FormData object with the file
    });
    return handleResponse(response);
  },
  
  // Upload multiple receipts
  uploadMultipleReceipts: async (token, formData) => {
    const response = await fetch(`${BASE_URL}/upload-multiple-receipts`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData // FormData object with multiple files
    });
    return handleResponse(response);
  },
  
  // Get all receipts with optional filters
  getReceipts: async (token, filters = {}) => {
    // Convert filters object to query string
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    const response = await fetch(`${BASE_URL}/get-receipts${queryString}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },
  
  // Get receipt by ID
  getReceiptById: async (token, id) => {
    const response = await fetch(`${BASE_URL}/get-receipt/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },
  
  // Update receipt currency
  updateReceiptCurrency: async (token, id, currency) => {
    const response = await fetch(`${BASE_URL}/update-receipt-currency/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currency })
    });
    return handleResponse(response);
  },
  
  // Get currency statistics
  getCurrencyStats: async (token) => {
    const response = await fetch(`${BASE_URL}/currency-stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },
  
  // Delete receipt by ID
  deleteReceipt: async (token, id) => {
    const response = await fetch(`${BASE_URL}/delete-receipt/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },
  
  // Delete all receipts
  deleteAllReceipts: async (token) => {
    const response = await fetch(`${BASE_URL}/delete-all-receipts?confirm=true`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },
  
  // Get receipt analytics
  getReceiptAnalytics: async (token) => {
    const response = await fetch(`${BASE_URL}/receipt-analytics`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },
  
  // Add manual receipt
  addManualReceipt: async (token, receiptData) => {
    const formData = new FormData();
    formData.append('manualReceiptData', JSON.stringify(receiptData));
    
    const response = await fetch(`${BASE_URL}/add-manual-receipt`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    return handleResponse(response);
  }
};

// Export all API services
export const api = {
  auth,
  receipts
};

export default api;