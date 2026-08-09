const http = require('http');
const fs = require('fs');
const path = require('path');

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 8080);
const publicDir = path.join(__dirname, 'public');
const adDir = path.join(__dirname, 'add');
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

const adExtensions = new Set(['.gif', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.mp4', '.webm', '.txt']);

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
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8'
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

function sendAdList(response) {
  fs.readdir(adDir, { withFileTypes: true }, (error, entries = []) => {
    if (error && error.code !== 'ENOENT') {
      response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: 'Unable to read add folder' }));
      return;
    }

    const ads = entries
      .filter((entry) => entry.isFile())
      .filter((entry) => adExtensions.has(path.extname(entry.name).toLowerCase()))
      .map((entry) => ({
        name: entry.name,
        url: `/add/${encodeURIComponent(entry.name)}`,
        type: path.extname(entry.name).toLowerCase()
      }));

    response.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(JSON.stringify({ ads }));
  });
}

function safeAdPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0]);
  const requestedName = decodedPath.replace('/add/', '');
  if (!requestedName || requestedName.includes('/')) {
    return null;
  }
  const filePath = path.normalize(path.join(adDir, requestedName));
  if (!filePath.startsWith(adDir)) {
    return null;
  }
  return filePath;
}

const server = http.createServer((request, response) => {
  const urlPath = (request.url || '/').split('?')[0];

  if (urlPath === '/api/ads') {
    sendAdList(response);
    return;
  }

  if (urlPath.startsWith('/add/')) {
    const adPath = safeAdPath(request.url || '/');
    if (!adPath) {
      response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Forbidden');
      return;
    }
    fs.readFile(adPath, (error, content) => {
      if (error) {
        response.writeHead(error.code === 'ENOENT' ? 404 : 500, {
          'Content-Type': 'text/plain; charset=utf-8'
        });
        response.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
        return;
      }
      const ext = path.extname(adPath).toLowerCase();
      response.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      response.end(content);
    });
    return;
  }

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
