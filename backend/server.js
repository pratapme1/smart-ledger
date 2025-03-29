// server.js (at the very top)
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Determine environment
const NODE_ENV = process.env.NODE_ENV || 'development';
console.log(`Running in ${NODE_ENV} environment`);

// In production, we skip loading .env files altogether
if (NODE_ENV !== 'production') {
  const envFile = `.env.${NODE_ENV}`;
  const envPath = path.resolve(__dirname, envFile);
  
  // Check if file exists before trying to load it
  if (fs.existsSync(envPath)) {
    console.log(`Loading environment from ${envFile}`);
    dotenv.config({ path: envPath });
  } else {
    console.error(`❌ Environment file ${envFile} not found!`);
    process.exit(1);
  }
} else {
  console.log('Production environment detected, using platform environment variables');
}

// Rest of your imports
const express = require('express');
const cors = require('cors');
const passport = require('passport');

// Create Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log("✅ Uploads directory created");
}

// Temporary debug endpoint (REMOVE IN PRODUCTION)
if (NODE_ENV === 'production') {
  app.get('/debug-env', (req, res) => {
    res.json({
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
      JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
      PORT: process.env.PORT,
      // Don't log actual values of sensitive variables
    });
  });
}

// Database connection
require('./config/db')();

// Passport Config
require('./config/passport')(passport);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/', require('./routes/receipts'));

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      message: "❌ File size too large. Maximum size is 10MB." 
    });
  }
  
  res.status(500).json({ 
    message: "❌ Server error occurred.", 
    error: err.message 
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);

function shutDown() {
  console.log('🛑 Closing server and database connections...');
  require('mongoose').connection.close(() => {
    console.log('✅ MongoDB connection closed.');
    process.exit(0);
  });
}