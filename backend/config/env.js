// config/env.js
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Determine environment
const NODE_ENV = process.env.NODE_ENV || 'development';

// Only attempt to load .env file in non-production environments
if (NODE_ENV !== 'production') {
  const envFile = `.env.${NODE_ENV}`;
  const envPath = path.resolve(process.cwd(), envFile);
  
  // Check if file exists before trying to load it
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.error(`❌ Error loading ${envFile}:`, result.error);
    } else {
      console.log(`✅ Loaded environment from ${envFile} for ${NODE_ENV} mode`);
    }
  } else {
    console.error(`❌ Environment file ${envFile} not found!`);
    // Don't exit in production
    if (NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
} else {
  console.log('Production environment detected, using platform environment variables');
}

// Export environment variables
module.exports = {
  PORT: process.env.PORT || 8080,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRE: process.env.JWT_EXPIRE || '1d',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  EMAIL_USERNAME: process.env.EMAIL_USERNAME,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  FRONTEND_URL: process.env.FRONTEND_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY
};