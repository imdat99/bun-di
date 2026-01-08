const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'ui', 'index.html');
const destDir = path.join(__dirname, '..', 'dist', 'ui');
const dest = path.join(destDir, 'index.html');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(src, dest);
console.log('Copied UI assets to dist/ui');
