const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const DIR = path.join(__dirname, '..', 'admin-portal');

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '192.168.188.78';
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// In-Memory Battle Sessions Store
const battleSessions = {};

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Health check / ping endpoint
  if (pathname === '/api/ping' || pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, ip: getLocalIp(), port: PORT, time: Date.now() }));
    return;
  }

  // --- API ROUTING FOR LIVE BATTLE ---
  if (pathname.startsWith('/api/battle')) {
    if (pathname === '/api/battle/session' && req.method === 'GET') {
      const pin = parsedUrl.searchParams.get('pin');
      if (pin && battleSessions[pin]) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(battleSessions[pin]));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Session not found' }));
      }
      return;
    }

    if (pathname === '/api/battle/session' && (req.method === 'POST' || req.method === 'PATCH')) {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const pin = data.pin;
          if (pin) {
            battleSessions[pin] = { ...(battleSessions[pin] || {}), ...data };
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(battleSessions[pin]));
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Missing pin' }));
          }
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }
  }

  // --- STATIC FILES ---
  let cleanPath = pathname;
  if (cleanPath.startsWith('/admin-portal')) {
    cleanPath = cleanPath.slice('/admin-portal'.length) || '/';
  }
  const filePath = path.join(DIR, cleanPath === '/' ? '/index.html' : cleanPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(DIR, 'index.html'), (err2, fallback) => {
          if (err2) {
            res.writeHead(404);
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(fallback, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const localIp = getLocalIp();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(` RailTrainer Web-Dashboard & Quiz Battle Server`);
  console.log(`=================================================`);
  console.log(` Host / PC:     http://localhost:${PORT}`);
  console.log(` Smartphone/QR: http://${localIp}:${PORT}/play.html`);
  console.log(`=================================================`);
});
