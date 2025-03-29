// routes/auth.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/auth');

// Register route
router.post('/register', authController.register);

// Login route
router.post('/login', passport.authenticate('local', { session: false }), authController.login);

// Google auth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false }), authController.socialLoginCallback);

// GitHub auth routes
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback', passport.authenticate('github', { session: false }), authController.socialLoginCallback);

// Password reset routes
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Get user info route (protected)
router.get('/user', authenticateJWT, authController.getUser);

module.exports = router;