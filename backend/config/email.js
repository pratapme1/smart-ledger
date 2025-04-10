// config/email.js
const nodemailer = require('nodemailer');

// Determine which email configuration to use based on environment
const createTransporter = () => {
  // Check environment variables
  if (!process.env.EMAIL_USERNAME || !process.env.EMAIL_PASSWORD) {
    console.warn('WARNING: Email credentials not properly configured in environment variables');
    console.warn('Set EMAIL_USERNAME and EMAIL_PASSWORD for password reset to work');
  }

  // For Gmail
  if (process.env.EMAIL_SERVICE === 'gmail') {
    console.log('Configuring email transporter using Gmail');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } 
  // For custom SMTP server
  else if (process.env.EMAIL_HOST) {
    console.log('Configuring email transporter using custom SMTP server');
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } 
  // Fallback to a standard configuration
  else {
    console.log('Configuring email transporter using default settings');
    return nodemailer.createTransport({
      service: 'Gmail', // Default to Gmail
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
};

// Create the transporter
const transporter = createTransporter();

// Verify the connection configuration
transporter.verify(function(error, success) {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

module.exports = transporter;