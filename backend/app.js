const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const passport = require('passport');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const receiptRoutes = require('./routes/receipts');
const smartAnalysisRoutes = require('./routes/smartAnalysis');
const enhancedAnalysis = require('./routes/enhancedAnalysis');

// Initialize Express app
const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
require('./config/passport')(passport);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/smart-analysis', smartAnalysisRoutes);
app.use('/api/enhanced-insights', enhancedAnalysis);

// Simple root route for API health check
app.get('/', (req, res) => {
  res.json({
    message: "Smart Ledger API is running",
    version: "1.0.0",
    status: "active"
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app; 