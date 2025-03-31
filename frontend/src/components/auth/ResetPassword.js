import React, { useState, useContext, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  const { token } = useParams();
  const { resetPassword, loading, error } = useContext(AuthContext);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Validate token presence
    if (!token) {
      toast.error('Invalid password reset link');
      navigate('/login');
    }
  }, [token, navigate]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setValidationError('');
    
    // Validate passwords
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }
    
    try {
      await resetPassword(token, password);
      setResetSuccess(true);
      toast.success('Password reset successful!');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      toast.error(error || 'Failed to reset password. The link may be invalid or expired.');
    }
  };
  
  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Password Reset Successful
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Your password has been reset. You can now login with your new password.
            </p>
          </div>
          <div className="mt-6 text-center">
            <p>Redirecting to login page...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please enter your new password
          </p>
        </div>
        
        {(error || validationError) && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error || validationError}</span>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="password" className="sr-only">New Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">Confirm New Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
          
          <div className="flex items-center justify-center">
            <div className="text-sm">
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Return to login
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;