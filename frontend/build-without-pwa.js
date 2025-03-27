const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Backup the original index.js file
const indexPath = path.join(__dirname, 'src', 'index.js');
const backupPath = path.join(__dirname, 'src', 'index.js.backup');

// Read the original file
const originalContent = fs.readFileSync(indexPath, 'utf8');
fs.writeFileSync(backupPath, originalContent);

// Create a modified version without service worker
const modifiedContent = originalContent
  .replace(/import.*serviceWorkerRegistration.*;/g, '// Service worker disabled for production build')
  .replace(/serviceWorkerRegistration\.register\(\);/g, '// Service worker disabled for production build');

// Write the modified file
fs.writeFileSync(indexPath, modifiedContent);

try {
  // Run the actual build command
  console.log('Building without service worker...');
  execSync('react-scripts build', { stdio: 'inherit' });
} finally {
  // Restore the original file
  fs.copyFileSync(backupPath, indexPath);
  fs.unlinkSync(backupPath);
}