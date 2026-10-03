'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { WebSocket, WebSocketServer } = require('ws');

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
const HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cache-Control': 'no-store',
};

function json(res, status, value) {
  res.writeHead(status, { ...HEADERS, 'Content-Type': MIME['.json'] });
  res.end(JSON.stringify(value));
}

function validGaze(value) {
  return value && value.type === 'gaze' && typeof value.valid === 'boolean' &&
    (!value.valid || (Number.isFinite(value.x) && Number.isFinite(value.y) &&
      value.x >= 0 && value.x <= 1 && value.y >= 0 && value.y <= 1));
}

/** One HTTP/WebSocket origin; no text, camera frames or API keys leave this service. */
function createApplication(options = {}) {
  const publicDir = options.publicDir || path.join(__dirname, 'public');
  const languagesDir = options.languagesDir || path.join(__dirname, 'languages');
  const origins = new Set(options.origins || ['http://localhost:3000', 'http://127.0.0.1:3000',
    'http://localhost:8080', 'http://127.0.0.1:8080']);
  const hosts = new Set([...origins].map(origin => new URL(origin).host));
  let closed = false, backend = null, reconnect = null, attempts = 0;
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096, perMessageDeflate: false });
  const send = (client, data) => {
    if (client.readyState === WebSocket.OPEN && client.bufferedAmount < 16384) client.send(JSON.stringify(data));
  };
  const broadcast = data => { for (const client of wss.clients) send(client, data); };
  let tracking = { type: 'gaze', valid: false, reason: 'disconnected' };

  const server = http.createServer(async (req, res) => {
    try {
      // Reject DNS rebinding and browser requests from other origins. Remote access is explicit.
      if (!hosts.has(req.headers.host) || (req.headers.origin && !origins.has(req.headers.origin))) {
        req.resume(); return json(res, 403, { error: 'Origin or host not allowed' });
      }
      const url = new URL(req.url, 'http://localhost');
      if (options.handleRequest && await options.handleRequest(req, res, url, json)) return;
      if (!['GET', 'HEAD'].includes(req.method)) { req.resume(); return json(res, 405, { error: 'Method not allowed' }); }
      if (url.pathname === '/health') return json(res, 200, { status: 'ok', tracking: tracking.valid });
      if (url.pathname === '/config') return json(res, 200, { websocketPath: '/ws', language: options.language || 'en' });
      if (url.pathname === '/api/languages') {
        const files = (await fs.readdir(languagesDir)).filter(file => /^[a-z]{2,3}(?:-[A-Za-z0-9]+)*\.json$/.test(file));
        const packs = await Promise.all(files.map(async file => JSON.parse(await fs.readFile(path.join(languagesDir, file), 'utf8'))));
        return json(res, 200, packs.map(({ code, name, direction }) => ({ code, name, direction })));
      }
      const pathname = decodeURIComponent(url.pathname);
      const language = pathname.startsWith('/languages/');
      const root = language ? languagesDir : publicDir;
      const relative = language ? pathname.slice('/languages/'.length) : pathname === '/' ? 'index.html' : pathname.slice(1);
      const file = path.resolve(root, relative);
      if (!file.startsWith(path.resolve(root) + path.sep) || relative.split(/[\\/]/).some(part => part.startsWith('.'))) {
        return json(res, 404, { error: 'Not found' });
      }
      if (!MIME[path.extname(file)]) return json(res, 404, { error: 'Not found' });
      const content = await fs.readFile(file);
      res.writeHead(200, { ...HEADERS, 'Content-Type': MIME[path.extname(file)], 'Content-Length': content.length });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      if (!res.headersSent) json(res, error.code === 'ENOENT' || error.code === 'EISDIR' ? 404 : 400, { error: 'Request could not be served' });
      else res.end();
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.maxHeadersCount = 40;
  server.on('upgrade', (req, socket, head) => {
    if (closed || req.url !== '/ws' || !origins.has(req.headers.origin) || !hosts.has(req.headers.host) || wss.clients.size >= 8) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return;
    }
    wss.handleUpgrade(req, socket, head, client => wss.emit('connection', client));
  });
  wss.on('connection', client => {
    client.on('error', () => {});
    client.alive = true;
    client.on('pong', () => { client.alive = true; });
    // The stream is read-only. Suggestions are computed locally in each browser.
    client.on('message', () => client.close(1008, 'Read-only stream'));
    send(client, tracking);
  });
  const heartbeat = setInterval(() => {
    for (const client of wss.clients) {
      if (!client.alive) client.terminate();
      else { client.alive = false; client.ping(); }
    }
  }, 30000);
  heartbeat.unref();

  function connect() {
    if (closed || !options.backendUrl) return;
    backend = new WebSocket(options.backendUrl, { maxPayload: 4096, handshakeTimeout: 5000,
      headers: options.backendToken ? { Authorization: `Bearer ${options.backendToken}` } : {} });
    backend.on('open', () => { attempts = 0; });
    backend.on('message', message => {
      try {
        const data = JSON.parse(message.toString());
        if (validGaze(data)) {
          tracking = { type: 'gaze', valid: data.valid, x: data.x, y: data.y,
            reason: String(data.reason || '').slice(0, 80), timestamp: Date.now() };
          broadcast(tracking);
        }
      } catch { /* Invalid backend data cannot break the server. */ }
    });
    backend.on('error', () => {}); // close is the only reconnect path
    backend.on('close', () => {
      tracking = { type: 'gaze', valid: false, reason: 'disconnected' };
      broadcast(tracking);
      if (!closed) {
        reconnect = setTimeout(connect, Math.min(30000, 500 * 2 ** Math.min(attempts++, 6)));
        reconnect.unref();
      }
    });
  }
  server.on('listening', connect);
  return {
    server,
    async close() {
      closed = true;
      clearTimeout(reconnect); clearInterval(heartbeat);
      if (backend) backend.terminate();
      for (const client of wss.clients) client.terminate();
      wss.close();
      await new Promise(resolve => server.close(resolve));
    },
  };
}

function start() {
  const port = Number(process.env.PORT || 3000);
  const app = createApplication({
    origins: process.env.ALLOWED_ORIGINS?.split(',').map(value => value.trim()),
    backendUrl: process.env.TRACKER_URL, backendToken: process.env.TRACKER_TOKEN,
    language: process.env.LANGUAGE || 'en',
  });
  app.server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`zekALS listening on port ${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { app.close().catch(() => { process.exitCode = 1; }); });
  return app;
}
if (require.main === module) start();
module.exports = { createApplication, validGaze, start };
