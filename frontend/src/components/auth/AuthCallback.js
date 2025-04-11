// components/auth/AuthCallback.js
import React, { useEffect, useContext, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import config from '../../config';

// Fallback for config.AUTH in case it's undefined
const AUTH = config?.AUTH || {
  TOKEN_KEY: 'token',
  USER_KEY: 'user',
  REMEMBER_ME_KEY: 'rememberMe'
};

const AuthCallback = () => {
  const [error, setError] = useState(null);
  const [processingComplete, setProcessingComplete] = useState(false);
  const { handleOAuthCallback } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Use useRef to track if callback has been processed
  const callbackProcessed = useRef(false);
  
  useEffect(() => {
    const processCallback = async () => {
      // Prevent multiple executions
      if (callbackProcessed.current) {
        console.log("AuthCallback: Already processed, skipping");
        return;
      }
      
      // Mark as processed immediately
      callbackProcessed.current = true;
      
      try {
        console.log("AuthCallback: Processing callback...");
        console.log("AuthCallback: URL:", window.location.href);
        
        // Get redirect path from session storage or default to wallet
        const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/wallet';
        console.log("AuthCallback: Target redirect path:", redirectPath);
        sessionStorage.removeItem('redirectAfterLogin');
        
        // Process token from URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const errorMsg = urlParams.get('error');
        
        console.log("AuthCallback: URL params:", {
          hasToken: !!token,
          hasError: !!errorMsg
        });
        
        // Check for error parameter
        if (errorMsg) {
          console.error("AuthCallback: Error from OAuth provider:", decodeURIComponent(errorMsg));
          throw new Error(decodeURIComponent(errorMsg));
        }
        
        // If token exists in URL, store it (for backward compatibility)
        if (token) {
          console.log("AuthCallback: Token received from URL");
          localStorage.setItem(AUTH.TOKEN_KEY, token);
          console.log("AuthCallback: Token stored in localStorage");
          
          // Set token in API headers
          if (api.setAuthToken) {
            api.setAuthToken(token);
            console.log("AuthCallback: Token set in API headers");
          }
        } else {
          console.log("AuthCallback: No token in URL, will try cookie-based auth");
        }
        
        try {
          // Get user data with token (either from cookie or authorization header)
          console.log("AuthCallback: Fetching user data...");
          const userData = await api.auth.getUser();
          
          if (userData && userData.user) {
            console.log("AuthCallback: User data received:", {
              id: userData.user._id,
              email: userData.user.email
            });
            
            localStorage.setItem(AUTH.USER_KEY, JSON.stringify(userData.user));
            console.log("AuthCallback: User data stored in localStorage");
            
            // Update auth context if needed
            if (handleOAuthCallback && typeof handleOAuthCallback === 'function') {
              try {
                await handleOAuthCallback(token); // Pass token if available
                console.log("AuthCallback: Auth context updated");
              } catch (contextError) {
                console.warn("AuthCallback: Error updating auth context:", contextError);
                // Continue even if context update fails
              }
            }
            
            // Show success message ONCE
            toast.success('Login successful!', {
              toastId: 'login-success',
              autoClose: 3000
            });
            
            setProcessingComplete(true);
            
            // DIRECT NAVIGATION - Most reliable method
            console.log("AuthCallback: Will redirect to wallet in 1 second");
            setTimeout(() => {
              console.log("AuthCallback: Redirecting to wallet NOW");
              window.location.href = '/wallet';
            }, 1000);
            
          } else {
            console.error("AuthCallback: User data invalid or empty");
            throw new Error('Failed to get user data');
          }
        } catch (fetchError) {
          console.error('AuthCallback: Error fetching user data:', fetchError);
          console.error('AuthCallback: Response:', fetchError.response?.data);
          throw new Error('Failed to get user profile. Please try again.');
        }
      } catch (error) {
        console.error('AuthCallback error:', error);
        setError(error.message || 'Social login failed');
        
        toast.error(error.message || 'Social login failed. Please try again.', {
          toastId: 'login-error',
          autoClose: 5000
        });
        
        setTimeout(() => {
          console.log("AuthCallback: Redirecting to login due to error");
          window.location.href = '/login';
        }, 2000);
      }
    };
    
    processCallback();
  }, []);
  
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