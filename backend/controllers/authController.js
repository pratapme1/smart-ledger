// controllers/authController.js
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { generateToken } = require('../utils/auth');
const transporter = require('../config/email');

// Register user
exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  
  try {
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }
    
    // Create new user
    user = new User({
      name,
      email,
      authMethod: 'local'
    });
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    
    await user.save();
    
    // Generate token
    const token = generateToken(user);
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// User login
exports.login = (req, res) => {
  // The actual authentication is handled by Passport middleware
  // This just generates the token and sends the response
  const token = generateToken(req.user);
  
  res.json({
    token,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email
    }
  });
};

// Get authenticated user
exports.getUser = (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      authMethod: req.user.authMethod
    }
  });
};

// Social login callback
exports.socialLoginCallback = (req, res) => {
  const token = generateToken(req.user);
  res.redirect(`${process.env.FRONTEND_URL}/auth-callback?token=${token}`);
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (user.authMethod !== 'local') {
      return res.status(400).json({ 
        message: `This account uses ${user.authMethod} authentication. Please sign in with ${user.authMethod}.` 
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash the token before saving to database
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

  // Set token and expiry
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
     
    await user.save();
    
    // Send email
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: user.email,
      subject: 'Smart Ledger - Password Reset',
      html: `
        <p>You requested a password reset for your Smart Ledger account.</p>
        <p>Please click on the following link to reset your password:</p>
        <a href="${resetURL}">${resetURL}</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    res.json({ message: "Password reset email sent" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
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
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    
    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    console.log('Password reset successful');
    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};