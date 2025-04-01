// src/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';
import config from '../config';

// Use config.AUTH instead of AUTH_CONFIG
const AUTH_CONFIG = config.AUTH;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Initialize authentication state
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check for token in localStorage
        const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
        const storedUser = localStorage.getItem(AUTH_CONFIG.USER_KEY);
        
        console.log("AuthContext init:", { 
          tokenExists: !!token, 
          storedUserExists: !!storedUser,
          tokenKey: AUTH_CONFIG.TOKEN_KEY,
          userKey: AUTH_CONFIG.USER_KEY,
          apiUrl: config.API_URL, // Log API URL for debugging
          baseUrl: config.BASE_URL  // Log BASE URL for debugging
        });
        
        if (!token) {
          setIsAuthenticated(false);
          setUser(null);
          setLoading(false);
          return;
        }
        
        // Set token in API headers
        api.setAuthToken(token);
        
        // Set authenticated state from localStorage first for faster UI response
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
          console.log("Set initial auth state from localStorage:", { user: parsedUser.email });
        }
        
        // Verify with server regardless of stored data
        try {
          console.log("Verifying token with server...");
          const userData = await api.auth.getUser();
          
          if (userData && userData.user) {
            console.log("Server verification successful:", userData.user);
            setUser(userData.user);
            setIsAuthenticated(true);
            localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(userData.user));
          } else {
            console.error("Server returned invalid user data");
            throw new Error('Invalid user data from server');
          }
        } catch (error) {
          console.error('Authentication verification failed:', error);
          
          // Only clear auth data if it's an authentication error (401)
          if (error.response && error.response.status === 401) {
            console.log("Clearing invalid auth data due to 401");
            localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
            localStorage.removeItem(AUTH_CONFIG.USER_KEY);
            setUser(null);
            setIsAuthenticated(false);
          } else {
            // For other errors (e.g., network), keep using localStorage data
            console.log("Keeping localStorage auth data due to non-401 error");
            // We already set the state from localStorage above
          }
        }
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Login function
  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await api.auth.login(credentials);
      
      if (!response || !response.token) {
        throw new Error('Invalid response from server');
      }
      
      const { token, user } = response;
      
      // Store authentication data
      localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token);
      
      if (user) {
        localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(user));
        setUser(user);
      }
      
      setIsAuthenticated(true);
      
      // Set token in API headers
      api.setAuthToken(token);
      
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
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
    try {
      const response = await api.auth.register(userData);
      
      if (response.token) {
        localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, response.token);
        
        if (response.user) {
          localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(response.user));
          setUser(response.user);
        }
        
        setIsAuthenticated(true);
        api.setAuthToken(response.token);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Registration failed'
      };
    } finally {
      setLoading(false);
    }
  };
  
  // Logout function
  const logout = () => {
    // Clear auth data
    localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
    localStorage.removeItem(AUTH_CONFIG.USER_KEY);
    
    // Update state
    setUser(null);
    setIsAuthenticated(false);
    
    // Clear token from API headers
    api.setAuthToken(null);
  };
  
  // Handle OAuth callback - UPDATED for more reliable operation
  const handleOAuthCallback = async (token) => {
    console.log("handleOAuthCallback received token:", !!token);
    
    if (!token) {
      console.error("No token provided to handleOAuthCallback");
      return false;
    }
    
    try {
      // 1. Store token first
      localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, token);
      
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
        localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(userData.user));
        setUser(userData.user);
        return true;
      } else {
        throw new Error('Invalid user data from server');
      }
    } catch (error) {
      console.error('OAuth callback processing error:', error);
      return false;
    }
  };
  
  // Provide auth context
  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    handleOAuthCallback
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;