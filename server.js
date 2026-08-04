const http = require('http');
const fs = require('fs');
const path = require('path');

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 8080);
const publicDir = path.join(__dirname, 'public');
const localSiteRoutes = new Set([
  '/files',
  '/media',
  '/chirp',
  '/shopping',
  '/chores',
  '/manuals',
  '/emergency',
  '/calendar'
]);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4'
};

function safePath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0]);
  const requestedPath = decodedPath === '/' || localSiteRoutes.has(decodedPath)
    ? '/index.html'
    : decodedPath;
  const filePath = path.normalize(path.join(publicDir, requestedPath));
  if (!filePath.startsWith(publicDir)) {
    return null;
  }
  return filePath;
}

const server = http.createServer((request, response) => {
  const filePath = safePath(request.url || '/');
  if (!filePath) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500, {
        'Content-Type': 'text/plain; charset=utf-8'
      });
      response.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(content);
  });
});

server.listen(port, host, () => {
  const displayHost = host === '0.0.0.0' ? 'your-computer-ip' : host;
  console.log(`Local Home Net running at http://${displayHost}:${port}`);
  console.log('This server is available to computers on your local network when your firewall allows the port.');
});
