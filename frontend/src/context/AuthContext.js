import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';

// Create the Auth Context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  
  // Check if token is expired
  const isTokenExpired = (token) => {
    if (!token) return true;
    
    try {
      const decoded = jwtDecode(token);
      const isExpired = decoded.exp < Date.now() / 1000;
      
      console.log('Token expiration check:', {
        current: Date.now() / 1000,
        expiry: decoded.exp,
        isExpired
      });
      
      return isExpired;
    } catch (error) {
      console.error('Token decoding error:', error);
      return true;
    }
  };
  
  // Load user from token
  useEffect(() => {
    const loadUser = async () => {
      console.log('Loading user - Token:', token);
      
      if (token && !isTokenExpired(token)) {
        try {
          setLoading(true);
          
          // Use new method that doesn't require token parameter
          const userData = await api.auth.getUser();
          
          console.log('User data loaded:', userData);
          setUser(userData.user);
        } catch (err) {
          console.error('Error loading user:', err);
          
          // Detailed error logging
          if (err.response) {
            console.error('Error response:', err.response.data);
          }
          
          // Clear authentication state on error
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          
          // Navigate to login if user loading fails
          navigate('/login');
        } finally {
          setLoading(false);
        }
      } else {
        if (token) {
          console.log('Token is expired or invalid');
          localStorage.removeItem('token');
          setToken(null);
        }
        setLoading(false);
      }
    };
    
    loadUser();
  }, [token, navigate]);
  
  // Register user
  const register = async (formData) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Registering user:', formData);
      
      const response = await api.auth.register(formData);
      
      console.log('Registration response:', response);
      
      if (!response.token) {
        throw new Error('No token received after registration');
      }
      
      localStorage.setItem('token', response.token);
      setToken(response.token);
      setUser(response.user);
      
      // Navigate to dashboard after successful registration
      navigate('/dashboard');
      
      return response;
    } catch (err) {
      console.error('Registration error:', err);
      
      // More detailed error handling
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      setError(errorMessage);
      
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Login user
  const login = async (formData) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Logging in user:', formData.email);
      
      const response = await api.auth.login(formData);
      
      console.log('Login response:', response);
      
      if (!response.token) {
        throw new Error('No token received after login');
      }
      
      localStorage.setItem('token', response.token);
      setToken(response.token);
      setUser(response.user);
      
      // Navigate to dashboard after successful login
      navigate('/dashboard');
      
      return response;
    } catch (err) {
      console.error('Login error:', err);
      
      // More detailed error handling
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
      setError(errorMessage);
      
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Logout user
  const logout = () => {
    console.log('Logging out user');
    
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    
    // Navigate to login page
    navigate('/login');
  };
  
  // Handle social login callback
  const handleSocialLoginCallback = () => {
    const token = api.auth.processOAuthCallback();
    
    console.log('Social login callback - Token:', token);
    
    if (token) {
      localStorage.setItem('token', token);
      setToken(token);
      return true;
    }
    return false;
  };
  
  // Request password reset
  const forgotPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Requesting password reset for:', email);
      
      const response = await api.auth.forgotPassword(email);
      
      console.log('Password reset response:', response);
      
      return response;
    } catch (err) {
      console.error('Forgot password error:', err);
      
      const errorMessage = err.response?.data?.message || err.message || 'Failed to send reset email';
      setError(errorMessage);
      
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Reset password
  const resetPassword = async (token, password) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Resetting password');
      
      const response = await api.auth.resetPassword(token, password);
      
      console.log('Password reset response:', response);
      
      return response;
    } catch (err) {
      console.error('Reset password error:', err);
      
      const errorMessage = err.response?.data?.message || err.message || 'Failed to reset password';
      setError(errorMessage);
      
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Provide all auth values and functions
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        register,
        login,
        logout,
        forgotPassword,
        resetPassword,
        handleSocialLoginCallback,
        isAuthenticated: !!user,
        setError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};