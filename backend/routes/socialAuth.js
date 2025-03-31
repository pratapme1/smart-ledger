// routes/socialAuth.js
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Get environment variables
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

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${FRONTEND_URL}/auth-callback?error=${encodeURIComponent('Google authentication failed')}`,
    session: false 
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = generateToken(req.user);
      
      // Log successful authentication
      console.log(`✅ Google authentication successful for: ${req.user.email}`);
      
      // Redirect to frontend with token
      res.redirect(`${FRONTEND_URL}/auth-callback?token=${token}`);
    } catch (error) {
      console.error('❌ Error in Google callback:', error);
      res.redirect(`${FRONTEND_URL}/auth-callback?error=${encodeURIComponent('Failed to generate token')}`);
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
    failureRedirect: `${FRONTEND_URL}/auth-callback?error=${encodeURIComponent('GitHub authentication failed')}`,
    session: false 
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = generateToken(req.user);
      
      // Log successful authentication
      console.log(`✅ GitHub authentication successful for: ${req.user.email}`);
      
      // Redirect to frontend with token
      res.redirect(`${FRONTEND_URL}/auth-callback?token=${token}`);
    } catch (error) {
      console.error('❌ Error in GitHub callback:', error);
      res.redirect(`${FRONTEND_URL}/auth-callback?error=${encodeURIComponent('Failed to generate token')}`);
    }
  }
);

module.exports = router;