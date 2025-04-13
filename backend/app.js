const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const passport = require('passport');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const receiptRoutes = require('./routes/receipts');
const smartAnalysisRoutes = require('./routes/smartAnalysis');
const enhancedAnalysis = require('./routes/enhancedAnalysis');
const insightsRouter = require('./routes/insights');
const budgetRouter = require('./routes/budget');
const digestRouter = require('./routes/digest');
const priceRoutes = require('./routes/price');

console.log('Price routes imported:', priceRoutes ? 'Yes' : 'No');

// Import receipt processing utilities directly
const { extractTextWithGPT } = require('./utils/receiptExtractor');
const { enhancedCurrencyDetection } = require('./utils/currencyDetection');

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
app.use(cookieParser(process.env.COOKIE_SECRET || process.env.JWT_SECRET));
app.use(passport.initialize());
require('./config/passport')(passport);

// Debug middleware
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path}`);
  next();
});

// Routes
console.log('Registering routes...');
app.use('/api/auth', authRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/smart-analysis', smartAnalysisRoutes);
app.use('/api/enhanced-insights', enhancedAnalysis);
app.use('/api/insights', insightsRouter);
app.use('/api/budget', budgetRouter);
app.use('/api/digest', digestRouter);
app.use('/api/price', priceRoutes);
console.log('Routes registered successfully');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  console.log(`404: ${req.method} ${req.path}`);
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;