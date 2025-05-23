// src/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';
import config from '../config';

// Use the AUTH object from config with fallbacks
const AUTH = {
  TOKEN_KEY: 'token',
  USER_KEY: 'user',
  REMEMBER_ME_KEY: 'rememberMe',
  ...(config?.AUTH || {}) // Spread config.AUTH if it exists, otherwise empty object
};

// Log the AUTH object for debugging
console.log("AuthContext initialized with AUTH keys:", AUTH);

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Initialize authentication state
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check for token in localStorage
        const token = localStorage.getItem(AUTH.TOKEN_KEY);
        const storedUser = localStorage.getItem(AUTH.USER_KEY);
        
        console.log("AuthContext init:", { 
          tokenExists: !!token, 
          storedUserExists: !!storedUser,
          tokenKey: AUTH.TOKEN_KEY,
          userKey: AUTH.USER_KEY,
          apiUrl: config?.API_URL,
          baseUrl: config?.BASE_URL
        });
        
        if (!token) {
          setIsAuthenticated(false);
          setUser(null);
          setLoading(false);
          return;
        }
        
        // Set token in API headers
        api.setAuthToken(token);
        
        // Try to get user info from API
        try {
          const response = await api.auth.getUser();
          setUser(response.user);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Auth check error:', error);
          // If API call fails, use stored user data
          if (storedUser) {
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setError(error.message);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Login function
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.auth.login(credentials);
      
      if (!response || !response.token) {
        throw new Error('Invalid response from server');
      }
      
      const { token, user } = response;
      
      // Store authentication data
      localStorage.setItem(AUTH.TOKEN_KEY, token);
      
      if (user) {
        localStorage.setItem(AUTH.USER_KEY, JSON.stringify(user));
        setUser(user);
      }
      
      setIsAuthenticated(true);
      
      // Set token in API headers
      api.setAuthToken(token);
      
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      setError(error.response?.data?.message || error.message || 'Login failed');
      return { 
        success: false,
        error: error.response?.data?.message || error.message || 'Login failed'
      };
    } finally {
      setLoading(false);
    }
  };
  
  // Register function
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.auth.register(userData);
      
      if (response.token) {
        localStorage.setItem(AUTH.TOKEN_KEY, response.token);
        
        if (response.user) {
          localStorage.setItem(AUTH.USER_KEY, JSON.stringify(response.user));
          setUser(response.user);
        }
        
        setIsAuthenticated(true);
        api.setAuthToken(response.token);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Registration failed:', error);
      setError(error.response?.data?.message || error.message || 'Registration failed');
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Registration failed'
      };
    } finally {
      setLoading(false);
    }
  };
  
  // Forgot password function
  const forgotPassword = async (email) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Sending forgot password request for:", email);
      await api.auth.forgotPassword(email);
      console.log("Forgot password request successful");
      return true;
    } catch (err) {
      console.error("Forgot password error:", err);
      setError(err.response?.data?.message || "Failed to send reset email");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (token, newPassword) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Resetting password with token");
      await api.auth.resetPassword(token, newPassword);
      console.log("Password reset successful");
      return true;
    } catch (err) {
      console.error("Password reset error:", err);
      setError(err.response?.data?.message || "Failed to reset password");
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Logout function
  const logout = () => {
    // Clear auth data
    localStorage.removeItem(AUTH.TOKEN_KEY);
    localStorage.removeItem(AUTH.USER_KEY);
    
    // Update state
    setUser(null);
    setIsAuthenticated(false);
    
    // Clear token from API headers
    api.setAuthToken(null);
  };
  
  // Handle OAuth callback
  const handleOAuthCallback = async (token) => {
    console.log("handleOAuthCallback received token:", !!token);
    
    if (!token) {
      console.error("No token provided to handleOAuthCallback");
      return false;
    }
    
    try {
      // 1. Store token first
      localStorage.setItem(AUTH.TOKEN_KEY, token);
      
      // 2. Set token in API headers
      api.setAuthToken(token);
      
      // 3. Set authenticated state (even before user data)
      setIsAuthenticated(true);
      
      // 4. Fetch user data
      console.log("Fetching user data with token...");
      const userData = await api.auth.getUser();
      
      if (userData && userData.user) {
        // Store user data and update state
        console.log("User data received:", userData.user);
        localStorage.setItem(AUTH.USER_KEY, JSON.stringify(userData.user));
        setUser(userData.user);
        return true;
      } else {
        throw new Error('Invalid user data from server');
      }
    } catch (error) {
      console.error('OAuth callback processing error:', error);
      setError(error.response?.data?.message || error.message || 'Authentication failed');
      return false;
    }
  };
  
  // Provide auth context
  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    handleOAuthCallback
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;