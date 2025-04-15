import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password2: ''
  });
  
  const [formErrors, setFormErrors] = useState({});
  const { register, error, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { name, email, password, password2 } = formData;
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    // Clear field-specific error when the field is edited
    if (formErrors[e.target.name]) {
      setFormErrors({
        ...formErrors,
        [e.target.name]: ''
      });
    }
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!name.trim()) errors.name = 'Name is required';
    
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (password !== password2) {
      errors.password2 = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      await register({ name, email, password });
      toast.success('Registration successful!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    }
  };
  
  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-logo">
          <h1>Smart Ledger</h1>
          <p>Your Personal Finance Manager</p>
        </div>
        
        {error && (
          <div className="error-message mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-input"
              placeholder="Enter your full name"
              value={name}
              onChange={handleChange}
            />
            {formErrors.name && <div className="error-message">{formErrors.name}</div>}
          </div>
          
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-input"
              placeholder="Enter your email"
              value={email}
              onChange={handleChange}
            />
            {formErrors.email && <div className="error-message">{formErrors.email}</div>}
          </div>
          
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                className="form-input"
                placeholder="Create a password"
                value={password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {formErrors.password && <div className="error-message">{formErrors.password}</div>}
          </div>
          
          <div className="form-group">
            <label className="form-label" htmlFor="password2">Confirm Password</label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="password2"
                name="password2"
                className="form-input"
                placeholder="Confirm your password"
                value={password2}
                onChange={handleChange}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {formErrors.password2 && <div className="error-message">{formErrors.password2}</div>}
          </div>
          
          <button type="submit" className={`register-button ${loading ? 'loading' : ''}`} disabled={loading}>
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
        
        <div className="sign-in-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;