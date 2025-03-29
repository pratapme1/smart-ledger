// server.js
const path = require('path');
const dotenv = require('dotenv');

// Determine which .env file to load
const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = `.env.${NODE_ENV}`;

// Load environment variables
const result = dotenv.config({ path: path.resolve(__dirname, envFile) });
if (result.error) {
  console.error(`❌ Error loading ${envFile}:`, result.error);
} else {
  console.log(`✅ Loaded environment from ${envFile} for ${NODE_ENV} mode`);
}

const express = require('express');
const cors = require('cors');
const passport = require('passport');
const fs = require('fs');

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