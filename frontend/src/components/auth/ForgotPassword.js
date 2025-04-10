import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FaEnvelope, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { forgotPassword, loading, error } = useContext(AuthContext);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submit button clicked");
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    
    console.log("About to call forgotPassword with email:", email);
    
    try {
      console.log("Attempting to reset password for:", email);
      await forgotPassword(email);
      console.log("Password reset request successful");
      setSent(true);
      toast.success('Password reset email sent!');
    } catch (err) {
      console.error("Password reset error:", err);
      toast.error(error || 'Failed to send reset email');
    }
  };
  
  if (sent) {
    return (
      <div className="forgot-password-container">
        <div className="forgot-password-card">
        <div className="success-container">
  <div className="success-icon">
    <FaCheckCircle />
  </div>
  <h2 className="success-title">Check your email</h2>
  
  <div className="success-message-box">
    <p className="success-message">
      We've sent a password reset link to <strong className="email-address">{email}</strong>. Please check your inbox and spam folder.
    </p>
  </div>
  
  <div className="success-message-box">
    <p className="success-message">
      The link will expire in 1 hour for security reasons.
    </p>
  </div>
</div>
          
          <div className="back-to-login">
            <Link to="/login">
              <FaArrowLeft style={{ marginRight: '0.5rem' }} />
              Return to login
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <div className="forgot-password-header">
          <h1>Reset your password</h1>
          <p>Enter your email address and we'll send you a link to reset your password</p>
        </div>
        
        {error && (
          <div className="error-message">
            <span>{error}</span>
          </div>
        )}
        
        <form className="forgot-password-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="password-input-container">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="form-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <span className="password-toggle" style={{ pointerEvents: 'none' }}>
                <FaEnvelope />
              </span>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="submit-button"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPassword;