// config/env.js
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Determine which .env file to load
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';

// Path to env file
const envPath = path.resolve(process.cwd(), envFile);

// Check if the file exists
if (!fs.existsSync(envPath)) {
  console.error(`❌ Environment file ${envFile} not found!`);
  process.exit(1);
}

// Load env vars from the appropriate file
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error(`❌ Error loading environment variables:`, result.error);
  process.exit(1);
}

console.log(`✅ Loaded environment from ${envFile} for ${process.env.NODE_ENV} mode`);

module.exports = {
  PORT: process.env.PORT || 8080,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRE: process.env.JWT_EXPIRE || '1d',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL,
  EMAIL_USERNAME: process.env.EMAIL_USERNAME,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  FRONTEND_URL: process.env.FRONTEND_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY
};