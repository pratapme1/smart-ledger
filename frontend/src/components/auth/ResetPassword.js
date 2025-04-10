import React, { useState, useContext, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import './ResetPassword.css';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
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
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="success-container">
            <div className="success-icon">
              <FaCheckCircle />
            </div>
            <h2 className="success-title">Password Reset Successful</h2>
            <p className="success-message">
              Your password has been reset successfully. You can now login with your new password.
            </p>
            <p className="success-message">
              Redirecting to login page...
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <div className="reset-password-header">
          <h1>Set New Password</h1>
          <p>Please create a new secure password for your account</p>
        </div>
        
        {(error || validationError) && (
          <div className="error-message">
            <span>{error || validationError}</span>
          </div>
        )}
        
        <form className="reset-password-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <div className="password-input-container">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                className="form-input"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <div className="password-input-container">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                className="form-input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex="-1"
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="reset-button"
          >
            {loading ? 'Updating...' : 'Reset Password'}
          </button>
          
          <div className="back-to-login">
            <Link to="/login">
              <FaArrowLeft style={{ marginRight: '0.5rem' }} />
              Return to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;