// Minimal static server for the built React app, with single-page-app fallback to index.html
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { WEB_PORT } = require('./ports');

const root = path.join(__dirname, '..', '.web-build');
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain'
};

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error('e2e/.web-build is missing. Run "npm run build:web" first.');
  process.exit(1);
}

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.normalize(path.join(root, urlPath));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(root, 'index.html');
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(WEB_PORT, '127.0.0.1', () => console.log(`Web app on http://127.0.0.1:${WEB_PORT}`));
