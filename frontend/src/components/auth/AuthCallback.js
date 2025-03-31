// components/auth/AuthCallback.js

import React, { useEffect, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';

const AuthCallback = () => {
  const [error, setError] = useState(null);
  const [processingComplete, setProcessingComplete] = useState(false);
  const { handleOAuthCallback } = useContext(AuthContext);
  const navigate = useNavigate();
  
  useEffect(() => {
    const processCallback = async () => {
      try {
        console.log("AuthCallback: Processing callback...");
        
        // Get redirect path from session storage or default to wallet
        const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/wallet';
        console.log("AuthCallback: Target redirect path:", redirectPath);
        sessionStorage.removeItem('redirectAfterLogin');
        
        // Process token from URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const errorMsg = urlParams.get('error');
        
        // Check for error parameter
        if (errorMsg) {
          throw new Error(decodeURIComponent(errorMsg));
        }
        
        // Verify token exists
        if (!token) {
          throw new Error('No authentication token received');
        }
        
        console.log("AuthCallback: Token received from URL");
        
        // Store token in localStorage directly
        localStorage.setItem('token', token);
        
        // Set token in API headers
        if (api.setAuthToken) {
          api.setAuthToken(token);
        }
        
        try {
          // Get user data with token
          console.log("AuthCallback: Fetching user data...");
          const userData = await api.auth.getUser();
          
          if (userData && userData.user) {
            console.log("AuthCallback: User data received:", userData.user);
            localStorage.setItem('user', JSON.stringify(userData.user));
            
            // Show success message
            toast.success('Login successful!');
            
            // DIRECT NAVIGATION - Most reliable method
            console.log("AuthCallback: Directly navigating to wallet page");
            window.location.href = '/wallet';
            return; // Stop further execution
          } else {
            throw new Error('Failed to get user data');
          }
        } catch (fetchError) {
          console.error('Error fetching user data:', fetchError);
          throw new Error('Failed to get user profile. Please try again.');
        }
      } catch (error) {
        console.error('AuthCallback error:', error);
        setError(error.message || 'Social login failed');
        toast.error(error.message || 'Social login failed. Please try again.');
        
        // Redirect to login after error
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    };
    
    processCallback();
  }, [navigate, handleOAuthCallback]);
  
  // Manual navigation function
  const handleManualRedirect = () => {
    console.log("Manual redirect to wallet");
    window.location.href = '/wallet';
  };
  
  return (
    <div className="auth-callback-container" style={{ 
      textAlign: 'center', 
      padding: '40px 20px',
      maxWidth: '500px',
      margin: '50px auto',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      {error ? (
        <div className="auth-error" style={{ color: '#dc3545' }}>
          <h3 style={{ fontSize: '24px', marginBottom: '16px' }}>Authentication Error</h3>
          <p style={{ fontSize: '16px', marginBottom: '20px' }}>{error}</p>
          <p>Redirecting to login page...</p>
        </div>
      ) : (
        <div className="auth-success">
          <div className="loading-spinner" style={{ 
            border: '4px solid #f3f3f3', 
            borderTop: '4px solid #007bff', 
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 24px'
          }}></div>
          
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '16px' }}>
            {processingComplete ? 'Login Successful!' : 'Completing your login...'}
          </h2>
          
          {processingComplete ? (
            <>
              <p style={{ fontSize: '16px', marginBottom: '24px' }}>
                You will be redirected to your wallet momentarily.
              </p>
              <p style={{ fontSize: '14px', marginBottom: '24px', color: '#6c757d' }}>
                If you're not redirected automatically, please click the button below.
              </p>
              <button 
                onClick={handleManualRedirect} 
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                Go to Wallet
              </button>
            </>
          ) : (
            <p style={{ fontSize: '16px' }}>Please wait while we verify your account...</p>
          )}
        </div>
      )}
      
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          button:hover {
            background-color: #0069d9 !important;
          }
        `}
      </style>
    </div>
  );
};

export default AuthCallback;