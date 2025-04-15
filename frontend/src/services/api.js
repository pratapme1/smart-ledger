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

// Create axios instance
const apiBaseUrl = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;
const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true // Important for cookie-based auth
});

// Add auth token to requests
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
    if (error.response && error.response.status === 401) {
      console.error('API: Authentication error - unauthorized access');
      // Don't automatically logout if on login/register pages
      const path = window.location.pathname;
      if (!path.includes('/login') && !path.includes('/register') && !path.includes('/auth/')) {
        console.log('API: Redirecting to login due to auth error');
        localStorage.removeItem(AUTH.TOKEN_KEY);
        localStorage.removeItem(AUTH.USER_KEY);
        window.location.href = '/login?expired=true';
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
      // Don't log the password
      const { email, name } = userData;
      console.log(`Registration attempt for: ${email}`);
      
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
      // Only log email, not password
      console.log(`Login attempt for: ${credentials.email}`);
      
      const response = await apiClient.post('/auth/login', credentials);
      
      // No need to manually store token as it's in HTTP-only cookie
      return response.data;
    } catch (error) {
      console.error('Login Error:', error);
      throw error;
    }
  },
  
  // Get authenticated user info - uses cookie auth automatically
  getUser: async () => {
    try {
      const response = await apiClient.get('/auth/user');
      return response.data;
    } catch (error) {
      console.error('Get User Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Logout - will clear the auth cookie on the server
  logout: async () => {
    try {
      await apiClient.get('/auth/logout');
      localStorage.removeItem(AUTH.USER_KEY);
      
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout Error:', error);
      // Still redirect even if there's an error
      window.location.href = '/login';
    }
  },
  
  // Request password reset
  forgotPassword: async (email) => {
    try {
      console.log(`API: Sending forgot password request for email: ${email}`);
      const response = await apiClient.post('/auth/forgot-password', { email });
      console.log('API: Forgot password response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Forgot Password Error:', error);
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
  
  // Social login URLs - using URL from env vars
  socialLogin: {
    google: `${BASE_URL}/api/auth/google`,
    github: `${BASE_URL}/api/auth/github`
  }
};

// Receipt API calls - no changes needed as they'll use the cookie auth automatically
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

// New AI Financial Insights module methods
const budgetMethods = {
  // Get budget configuration
  getBudgetConfig: async () => {
    try {
      const response = await apiClient.get('/budget');
      return response.data;
    } catch (error) {
      console.error('Get Budget Config Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Get budget analytics
  getBudgetAnalytics: async () => {
    try {
      const response = await apiClient.get('/budget/analytics');
      return response.data;
    } catch (error) {
      console.error('Get Budget Analytics Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Update budget configuration
  updateBudgetConfig: async (data) => {
    try {
      const response = await apiClient.post('/budget', data);
      return response.data;
    } catch (error) {
      console.error('Update Budget Config Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Delete a budget category
  deleteBudgetCategory: async (category) => {
    try {
      const response = await apiClient.delete(`/budget/${category}`);
      return response.data;
    } catch (error) {
      console.error('Delete Budget Category Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Reset monthly spending
  resetMonthlySpending: async () => {
    try {
      const response = await apiClient.post('/budget/reset');
      return response.data;
    } catch (error) {
      console.error('Reset Monthly Spending Error:', error.response?.data || error.message);
      throw error;
    }
  }
};

const insightsMethods = {
  // Get user insights
  getUserInsights: async (limit = 20, offset = 0) => {
    try {
      const response = await apiClient.get(`/insights?limit=${limit}&offset=${offset}`);
      return response.data;
    } catch (error) {
      console.error('Get User Insights Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Get insights for a specific receipt
  getReceiptInsights: async (receiptId) => {
    try {
      const response = await apiClient.get(`/insights/receipt/${receiptId}`);
      return response.data;
    } catch (error) {
      console.error('Get Receipt Insights Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Generate insights for a receipt
  generateInsightsForReceipt: async (receiptId) => {
    try {
      const response = await apiClient.post(`/insights/generate/${receiptId}`);
      return response.data;
    } catch (error) {
      console.error('Generate Receipt Insights Error:', error.response?.data || error.message);
      throw error;
    }
  }
};

const digestMethods = {
  // Get weekly digests
  getDigests: async () => {
    try {
      console.log('Fetching digests from:', `${apiBaseUrl}/digest`);
      const response = await apiClient.get('/digest');
      return response.data;
    } catch (error) {
      console.error('Get Digests Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Get a specific digest
  getDigest: async (id) => {
    try {
      console.log('Fetching digest:', id);
      const response = await apiClient.get(`/digest/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get Digest Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Generate a new digest
  generateDigest: async () => {
    try {
      console.log('Generating new digest');
      const response = await apiClient.post('/digest/generate');
      return response.data;
    } catch (error) {
      console.error('Generate Digest Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Get insights for a digest
  getDigestInsights: async (digestId) => {
    try {
      console.log('Fetching insights for digest:', digestId);
      const response = await apiClient.get(`/insights/digest/${digestId}`);
      return response.data;
    } catch (error) {
      console.error('Get Digest Insights Error:', error.response?.data || error.message);
      throw error;
    }
  }
};

const priceMethods = {
  // Compare prices across merchants
  comparePrice: async (itemName, price, merchant, category) => {
    try {
      console.log('Comparing price for:', { itemName, price, merchant, category });
      const response = await apiClient.post('/price/compare', {
        itemName,
        price,
        merchant,
        category
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data;
    } catch (error) {
      console.error('Price Comparison Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get price history for an item
  getPriceHistory: async (itemName, merchant) => {
    try {
      console.log('Fetching price history for:', { itemName, merchant });
      const response = await apiClient.get('/price/history', {
        params: { itemName, merchant },
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('Price history response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Get Price History Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get price trends for a category
  getCategoryTrends: async (category) => {
    try {
      console.log('Fetching category trends for:', category);
      const response = await apiClient.get('/price/trends', {
        params: { category },
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data;
    } catch (error) {
      console.error('Get Category Trends Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get best prices for a category
  getBestPrices: async (category) => {
    try {
      console.log('Fetching best prices for:', category);
      const response = await apiClient.get('/price/best-prices', {
        params: { category },
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data;
    } catch (error) {
      console.error('Get Best Prices Error:', error.response?.data || error.message);
      throw error;
    }
  }
};

// Export API
const api = {
  setAuthToken, // Keep for backward compatibility
  auth: authMethods,
  receipts: receiptMethods,
  budget: budgetMethods,
  insights: insightsMethods,
  digest: digestMethods,
  price: priceMethods
};

export default api;