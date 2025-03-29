// scripts/validate-env.js
const fs = require('fs');
const path = require('path');

const env = process.argv[2] || 'development';
const filePath = path.join(__dirname, '..', `.env.${env}`);

console.log(`Validating ${env} environment...`);

if (!fs.existsSync(filePath)) {
  console.error(`❌ .env.${env} file not found!`);
  process.exit(1);
}

const requiredVars = [
  'PORT',
  'MONGODB_URI',
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'EMAIL_USERNAME',
  'EMAIL_PASSWORD',
  'FRONTEND_URL',
  'OPENAI_API_KEY'
];

const envContent = fs.readFileSync(filePath, 'utf8');
const envVars = envContent
  .split('\n')
  .filter(line => line && !line.startsWith('#'))
  .map(line => line.split('=')[0]);

const missing = requiredVars.filter(variable => !envVars.includes(variable));

if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`✅ All required environment variables present in .env.${env}`);