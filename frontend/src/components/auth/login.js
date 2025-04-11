import React, { useState, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub, FaEye, FaEyeSlash } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import config from '../../config';
import './Login.css';

// Get API URL from environment variables with fallback
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// Fallback for config.AUTH in case it's undefined
const AUTH = config?.AUTH || {
  TOKEN_KEY: 'token',
  USER_KEY: 'user',
  REMEMBER_ME_KEY: 'rememberMe'
};

// Social login URLs
const SOCIAL_LOGIN = {
  google: `${API_URL}/api/auth/google`,
  github: `${API_URL}/api/auth/github`
};

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
  
  const { login } = useContext(AuthContext);
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

      if (!email || !password) {
        throw new Error('Please enter both email and password');
      }

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Login failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.token) {
        throw new Error('Invalid response from server. Missing token.');
      }

      localStorage.setItem(AUTH.TOKEN_KEY, data.token);
      if (data.user) {
        localStorage.setItem(AUTH.USER_KEY, JSON.stringify(data.user));
      }

      if (rememberMe) {
        localStorage.setItem(AUTH.REMEMBER_ME_KEY, 'true');
      }

      toast.success('Login successful!');
      setTimeout(() => {
        window.location.href = '/wallet';
      }, 500);
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    sessionStorage.setItem('redirectAfterLogin', from);
    if (formData.email) {
      sessionStorage.setItem('loginEmail', formData.email);
    }
    window.location.href = SOCIAL_LOGIN[provider];
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Sign in to Smart Ledger</h1>
          <p>Choose how you'd like to continue</p>
        </div>

        <div className="social-login-section">
          <button 
            type="button" 
            className="social-button google-button"
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
          >
            <FcGoogle size={18} />
            <span>Continue with Google</span>
          </button>
          
          <button 
            type="button" 
            className="social-button github-button"
            onClick={() => handleSocialLogin('github')}
            disabled={loading}
          >
            <FaGithub size={18} />
            <span>Continue with GitHub</span>
          </button>
        </div>

        <div className="login-divider">
          <span>EMAIL LOGIN</span>
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
            {loading ? 'Signing in...' : 'Sign in with email'}
          </button>
        </form>

        <div className="auth-options">
          <p>
            Don't have an account? <Link to="/register" className="register-link">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
