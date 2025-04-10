// routes/auth.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const transporter = require('../config/email');

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    user = new User({
      name,
      email,
      password
    });
    
    // Save user to database
    await user.save();
    
    // Generate token
    const token = generateToken(user);
    
    // Return token and user info
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`Login attempt for: ${email}`);
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User not found: ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    console.log(`User found with ID: ${user._id}`);
    
    // Log the stored hash for debugging (just show part of it for security)
    console.log(`Stored password hash: ${user.password ? user.password.substring(0, 10) + '...' : 'undefined'}`);
    
    // Check if password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`Password match result: ${isMatch}`);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = generateToken(user);
    
    // Return token and user info
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get authenticated user
router.get('/user', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({ user: req.user });
});

// Verify token
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user exists
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    
    res.json({ valid: true, user });
  } catch (error) {
    console.error('Token Verification Error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('Forgot password request received for email:', email);
    
    // Find user
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('No user found with email:', email);
      return res.status(404).json({ message: "User not found" });
    }
    
    console.log('User found:', user._id);
    
    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    console.log('Generated reset token');
    
    // Hash the token before saving to database
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Set token and expiry
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    
    await user.save();
    console.log('User saved with reset token');
    
    // Send email with the unhashed token
    const resetURL = `${FRONTEND_URL}/reset-password/${resetToken}`;
    console.log('Reset URL:', resetURL);
    
    try {
      // Email sending code
      const mailOptions = {
        from: process.env.EMAIL_USERNAME,
        to: user.email,
        subject: 'Password Reset',
        html: `
          <p>You requested a password reset.</p>
          <p>Click this link to reset your password:</p>
          <a href="${resetURL}">${resetURL}</a>
          <p>This link will expire in 1 hour.</p>
        `
      };
      
      console.log('Attempting to send email with options:', {
        from: process.env.EMAIL_USERNAME,
        to: user.email,
        subject: 'Password Reset'
      });

      await transporter.sendMail(mailOptions);
      console.log('Email sent successfully');
      
      res.json({ message: "Password reset email sent" });
    } catch (emailErr) {
      console.error('Email sending error:', emailErr);
      res.status(500).json({ message: "Error sending reset email" });
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: "Server error" });
  }
});  

// Reset password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;
    
    console.log('Reset attempt with token:', token);
    
    // Hash the received token to compare with stored hashed token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    console.log('Looking for user with hashed token:', hashedToken);
    
    // Find user with valid token (using the hashed version)
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      console.log('No user found with valid token');
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    
    console.log('User found, resetting password');
    
    // IMPORTANT CHANGE: Simply set the plain password and let the pre-save middleware handle the hashing
    // This prevents double-hashing issues
    user.password = password;
    
    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    
    console.log('Password reset successful');
    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: "Server error" });
  }
});

// SOCIAL LOGIN ROUTES

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${FRONTEND_URL}/oauth/callback?error=${encodeURIComponent('Google authentication failed')}`,
    session: false 
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = generateToken(req.user);
      
      // Log successful authentication
      console.log(`✅ Google authentication successful for: ${req.user.email}`);
      
      // Redirect to frontend with token - Use consistent OAuth callback path
      res.redirect(`${FRONTEND_URL}/auth-callback?token=${token}`);
    } catch (error) {
      console.error('❌ Error in Google callback:', error);
      // For both Google and GitHub error cases
      res.redirect(`${FRONTEND_URL}/auth-callback?error=${encodeURIComponent('Authentication failed')}`);
    }
  }
);

// GitHub OAuth routes
router.get('/github',
  passport.authenticate('github', { 
    scope: ['user:email'],
    session: false 
  })
);

router.get('/github/callback',
  passport.authenticate('github', { 
    failureRedirect: `${FRONTEND_URL}/oauth/callback?error=${encodeURIComponent('GitHub authentication failed')}`,
    session: false 
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = generateToken(req.user);
      
      // Log successful authentication
      console.log(`✅ GitHub authentication successful for: ${req.user.email}`);
      
      // Redirect to frontend with token - Use consistent OAuth callback path
      res.redirect(`${FRONTEND_URL}/auth-callback?token=${token}`);
    } catch (error) {
      console.error('❌ Error in GitHub callback:', error);
      // For both Google and GitHub error cases
      res.redirect(`${FRONTEND_URL}/auth-callback?error=${encodeURIComponent('Authentication failed')}`);
    }
  }
);

module.exports = router;