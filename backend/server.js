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
const session = require('express-session'); // Add this for OAuth

// Create Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Define frontend URL - strip trailing slash if present
let FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
if (FRONTEND_URL.endsWith('/')) {
  FRONTEND_URL = FRONTEND_URL.slice(0, -1);
}
console.log(`🔒 CORS allowing origin: ${FRONTEND_URL}`);

// Support multiple origins if needed
const allowedOrigins = [FRONTEND_URL];

// If we have local development, add localhost origins
if (NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000');
  // Add more origins if needed for local testing
}

// Log all allowed origins
console.log('🔒 CORS allowed origins:', allowedOrigins);

// Configure CORS with enhanced options and multiple origins support
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
  optionsSuccessStatus: 200
};

// Apply CORS middleware with proper options
app.use(cors(corsOptions));

// Add a middleware to explicitly set CORS headers for all routes
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // If the origin is in our allowed list, set it as the Access-Control-Allow-Origin
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    // Default to the primary frontend URL if origin isn't in the request
    res.header('Access-Control-Allow-Origin', FRONTEND_URL);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Session configuration (needed for OAuth)
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: NODE_ENV === 'production', // Use secure cookies in production
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session()); // Needed for OAuth strategies

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log("✅ Uploads directory created");
}

// Temporary debug endpoint (REMOVE IN PRODUCTION)
if (NODE_ENV !== 'production') {
  app.get('/debug-env', (req, res) => {
    res.json({
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
      JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
      PORT: process.env.PORT,
      FRONTEND_URL: process.env.FRONTEND_URL,
      CORS_ORIGINS: allowedOrigins,
      GOOGLE_CLIENT_ID_EXISTS: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET_EXISTS: !!process.env.GOOGLE_CLIENT_SECRET,
      GITHUB_CLIENT_ID_EXISTS: !!process.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET_EXISTS: !!process.env.GITHUB_CLIENT_SECRET,
      GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
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

// Mount receipt routes under /api prefix
app.use('/api', require('./routes/receipts'));

// Simple root route for API health check
app.get('/', (req, res) => {
  res.json({
    message: "Smart Ledger API is running",
    version: "1.0.0",
    status: "active"
  });
});

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
  console.log(`🌐 CORS allowing origins: ${allowedOrigins.join(', ')}`);
  
  // Use the dynamic URL for logging
  const apiUrl = process.env.NODE_ENV === 'production' 
  ? `${process.env.RAILWAY_STATIC_URL || 'https://smart-ledger-production.up.railway.app'}/api` 
  : `http://localhost:${PORT}/api`;
    
  console.log(`📡 API endpoints available at: ${apiUrl}`);
    
  // Log OAuth configuration status
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('✅ Google OAuth is configured');
    console.log(`📡 Google callback URL: ${process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'}`);
  } else {
    console.warn('⚠️ Google OAuth is not configured');
  }
  
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    console.log('✅ GitHub OAuth is configured');
    console.log(`📡 GitHub callback URL: ${process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback'}`);
  } else {
    console.warn('⚠️ GitHub OAuth is not configured');
  }
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