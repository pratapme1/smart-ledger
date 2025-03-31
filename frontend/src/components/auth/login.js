import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub, FaEye, FaEyeSlash } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get auth context functions and state
  const { login } = useContext(AuthContext);

  // Get the redirect path from location state or default to wallet
  const from = location.state?.from || '/wallet';

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { email, password, rememberMe } = formData;
      
      // Validate input
      if (!email || !password) {
        throw new Error('Please enter both email and password');
      }
      
      const response = await api.auth.login({ email, password });
      
      // Verify that we have the required data
      if (!response || !response.token) {
        throw new Error('Invalid response from server. Missing token.');
      }
      
      // Store token and user info
      localStorage.setItem('token', response.token);
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      // Set persistent login if remember me is checked
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }

      // Configure default headers for future API requests
      if (api.setAuthToken) {
        api.setAuthToken(response.token);
      }

      toast.success('Login successful!');
      
      // DIRECT NAVIGATION - More reliable than React Router's navigate
      setTimeout(() => {
        console.log("Login: Direct navigation to wallet page");
        window.location.href = '/wallet';
      }, 500);
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    // Store the intended redirect path before navigating away
    sessionStorage.setItem('redirectAfterLogin', from);
    
    // Save form data in case user returns without completing social login
    if (formData.email) {
      sessionStorage.setItem('loginEmail', formData.email);
    }
    
    console.log(`Login: Starting ${provider} social login`);
    console.log("Login: Storing redirect path:", from);
    
    window.location.href = api.auth.socialLogin[provider];
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Welcome back</h1>
          <p>Sign in to continue to Smart Ledger</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                className="form-input"
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={togglePasswordVisibility}
                tabIndex="-1"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="form-actions">
            <div className="remember-me">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              <label htmlFor="rememberMe">Remember me</label>
            </div>
            <Link to="/forgot-password" className="forgot-password">
              Forgot password?
            </Link>
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="social-login-divider">
          <span>or continue with</span>
        </div>

        <div className="social-login-buttons">
          <button 
            type="button" 
            className="social-button google-button"
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
          >
            <FcGoogle />
            <span>Google</span>
          </button>
          <button 
            type="button" 
            className="social-button github-button"
            onClick={() => handleSocialLogin('github')}
            disabled={loading}
          >
            <FaGithub />
            <span>GitHub</span>
          </button>
        </div>

        <div className="signup-prompt">
          <p>
            Don't have an account? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;