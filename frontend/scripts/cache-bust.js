const fs = require('fs');
const path = require('path');

// Function to add timestamp to file names
function addTimestampToFiles(dir) {
  const files = fs.readdirSync(dir);
  const timestamp = Date.now();

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      addTimestampToFiles(filePath);
    } else if (file.endsWith('.js') || file.endsWith('.css')) {
      const newFileName = file.replace(/(\.js|\.css)$/, `.${timestamp}$1`);
      fs.renameSync(filePath, path.join(dir, newFileName));

      // Update references in index.html
      if (file === 'index.html') {
        let content = fs.readFileSync(path.join(dir, newFileName), 'utf8');
        content = content.replace(
          new RegExp(file, 'g'),
          newFileName
        );
        fs.writeFileSync(path.join(dir, newFileName), content);
      }
    }
  });
}

// Start from the build directory
const buildDir = path.join(__dirname, '../build');
addTimestampToFiles(buildDir);

console.log('Cache busting completed successfully!'); 