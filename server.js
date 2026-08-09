const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 8080);
const publicDir = path.join(__dirname, 'public');
const adDir = path.join(__dirname, 'add');
const operatorDir = path.join(__dirname, 'operator');
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'db.json');
const sessions = new Map();
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



function defaultDb() {
  return {
    users: [],
    posts: [],
    sites: [],
    settings: { theme: 'dark' }
  };
}

function readDb() {
  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return defaultDb();
  }
}

function writeDb(db) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error('Body too large'));
      }
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, user) {
  const attempted = hashPassword(password, user.salt).hash;
  return crypto.timingSafeEqual(Buffer.from(attempted, 'hex'), Buffer.from(user.passwordHash, 'hex'));
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map((cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    return [name, decodeURIComponent(rest.join('='))];
  }));
}

function currentUser(request) {
  const sid = parseCookies(request).home_net_sid;
  if (!sid || !sessions.has(sid)) return null;
  const session = sessions.get(sid);
  const db = readDb();
  return db.users.find((user) => user.id === session.userId) || null;
}

function requireUser(request, response) {
  const user = currentUser(request);
  if (!user) {
    sendJson(response, 401, { error: 'Login required' });
    return null;
  }
  return user;
}

function publicUser(user) {
  return user ? { id: user.id, username: user.username, role: user.role } : null;
}

async function handleApi(request, response, urlPath) {
  const db = readDb();

  if (urlPath === '/api/me') {
    sendJson(response, 200, { user: publicUser(currentUser(request)), hasUsers: db.users.length > 0 });
    return true;
  }

  if (urlPath === '/api/register' && request.method === 'POST') {
    const body = await readJsonBody(request);
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    if (!username || password.length < 6) {
      sendJson(response, 400, { error: 'Username and a 6+ character password are required' });
      return true;
    }
    if (db.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
      sendJson(response, 409, { error: 'Username already exists' });
      return true;
    }
    const { salt, hash } = hashPassword(password);
    const user = {
      id: crypto.randomUUID(),
      username,
      role: db.users.length === 0 ? 'operator' : 'user',
      salt,
      passwordHash: hash,
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    writeDb(db);
    const sid = crypto.randomBytes(32).toString('hex');
    sessions.set(sid, { userId: user.id, createdAt: Date.now() });
    response.writeHead(201, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Set-Cookie': `home_net_sid=${sid}; HttpOnly; SameSite=Lax; Path=/`
    });
    response.end(JSON.stringify({ user: publicUser(user) }));
    return true;
  }

  if (urlPath === '/api/login' && request.method === 'POST') {
    const body = await readJsonBody(request);
    const user = db.users.find((entry) => entry.username.toLowerCase() === String(body.username || '').trim().toLowerCase());
    if (!user || !verifyPassword(String(body.password || ''), user)) {
      sendJson(response, 401, { error: 'Invalid username or password' });
      return true;
    }
    const sid = crypto.randomBytes(32).toString('hex');
    sessions.set(sid, { userId: user.id, createdAt: Date.now() });
    response.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Set-Cookie': `home_net_sid=${sid}; HttpOnly; SameSite=Lax; Path=/`
    });
    response.end(JSON.stringify({ user: publicUser(user) }));
    return true;
  }

  if (urlPath === '/api/logout' && request.method === 'POST') {
    const sid = parseCookies(request).home_net_sid;
    if (sid) sessions.delete(sid);
    response.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': 'home_net_sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
    });
    response.end(JSON.stringify({ ok: true }));
    return true;
  }

  if (urlPath === '/api/posts') {
    const user = requireUser(request, response);
    if (!user) return true;
    if (request.method === 'GET') {
      sendJson(response, 200, { posts: db.posts.slice(0, 50) });
      return true;
    }
    if (request.method === 'POST') {
      const body = await readJsonBody(request);
      const text = String(body.text || '').trim().slice(0, 240);
      if (!text) {
        sendJson(response, 400, { error: 'Post text is required' });
        return true;
      }
      db.posts.unshift({ id: crypto.randomUUID(), text, author: user.username, createdAt: new Date().toISOString() });
      db.posts = db.posts.slice(0, 200);
      writeDb(db);
      sendJson(response, 201, { posts: db.posts.slice(0, 50) });
      return true;
    }
  }

  if (urlPath === '/api/sites') {
    const user = requireUser(request, response);
    if (!user) return true;
    if (request.method === 'GET') {
      sendJson(response, 200, { sites: db.sites });
      return true;
    }
    if (request.method === 'POST') {
      const body = await readJsonBody(request);
      const site = {
        id: crypto.randomUUID(),
        name: String(body.name || '').trim().slice(0, 40),
        url: String(body.url || '').trim().slice(0, 300),
        icon: String(body.icon || '🔗').trim().slice(0, 4),
        description: 'Server-saved local site',
        createdBy: user.username,
        createdAt: new Date().toISOString()
      };
      if (!site.name || !site.url) {
        sendJson(response, 400, { error: 'Site name and URL are required' });
        return true;
      }
      db.sites.push(site);
      writeDb(db);
      sendJson(response, 201, { sites: db.sites });
      return true;
    }
  }

  if (urlPath === '/api/user-settings') {
    const user = requireUser(request, response);
    if (!user) return true;
    if (request.method === 'GET') {
      sendJson(response, 200, { settings: db.settings });
      return true;
    }
    if (request.method === 'POST') {
      const body = await readJsonBody(request);
      db.settings = { ...db.settings, ...body.settings };
      writeDb(db);
      sendJson(response, 200, { settings: db.settings });
      return true;
    }
  }

  return false;
}

function isLocalRequest(request) {
  const address = request.socket.remoteAddress || '';
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);
}

function sendOperatorSettings(response) {
  response.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(JSON.stringify({
    host,
    port,
    publicDir,
    adDir,
    dataDir,
    userCount: readDb().users.length,
    postCount: readDb().posts.length,
    siteCount: readDb().sites.length,
    localSiteRoutes: [...localSiteRoutes],
    adExtensions: [...adExtensions]
  }));
}

function sendOperatorPage(response) {
  const filePath = path.join(operatorDir, 'settings.html');
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Server error');
      return;
    }
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(content);
  });
}

function rejectOperatorRequest(response) {
  response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Server operator settings are only available on the server computer.');
}

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

const server = http.createServer(async (request, response) => {
  const urlPath = (request.url || '/').split('?')[0];

  try {
    if (urlPath.startsWith('/api/') && await handleApi(request, response, urlPath)) {
      return;
    }
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  if (urlPath === '/settings') {
    if (!isLocalRequest(request)) {
      rejectOperatorRequest(response);
      return;
    }
    sendOperatorPage(response);
    return;
  }

  if (urlPath === '/api/operator-settings') {
    if (!isLocalRequest(request)) {
      rejectOperatorRequest(response);
      return;
    }
    sendOperatorSettings(response);
    return;
  }

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
