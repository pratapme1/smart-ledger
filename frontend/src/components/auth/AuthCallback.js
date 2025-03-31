import React, { useEffect, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const AuthCallback = () => {
  const { handleSocialLoginCallback } = useContext(AuthContext);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  useEffect(() => {
    const processSocialLogin = async () => {
      try {
        const success = handleSocialLoginCallback();
        if (success) {
          toast.success('Successfully logged in!');
          navigate('/dashboard');
        } else {
          setError('Authentication failed. Please try again.');
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (err) {
        setError('Authentication failed. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };
    
    processSocialLogin();
  }, [handleSocialLoginCallback, navigate]);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
          <p className="mt-2">Redirecting to login...</p>
        </div>
      ) : (
        <>
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div>
          <h2 className="mt-6 text-center text-xl font-medium text-gray-900">
            Completing authentication...
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please wait while we authenticate your account
          </p>
        </>
      )}
    </div>
  );
};

export default AuthCallback;