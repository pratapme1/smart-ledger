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

// Updated currency detection endpoint
app.post('/detect-currency', async (req, res) => {
  const image = req.body.image;

  try {
    // Generate a temporary filename for the image
    const tempFilename = `temp_${Date.now()}.jpg`;
    const fs = require('fs');
    const path = require('path');
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Save the base64 image to a file
    const imagePath = path.join(uploadsDir, tempFilename);
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(imagePath, Buffer.from(base64Data, 'base64'));
    
    // Process the image directly with our updated receipt extractor
    const parsedResult = await extractTextWithGPT(imagePath, tempFilename);
    
    // Enhance currency detection
    const currencyResult = enhancedCurrencyDetection(parsedResult);
    
    // Cleanup temporary file
    fs.unlinkSync(imagePath);
    
    // Return the result
    res.json({
      receipt: parsedResult,
      currency: currencyResult
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Currency detection failed', message: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app;