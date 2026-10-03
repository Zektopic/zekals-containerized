'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const http = require('node:http');
const { WebSocket } = require('ws');
const { createApplication, validGaze } = require('../server');

async function fixture(t) {
  const app = createApplication({ origins: ['http://localhost:3000'] });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  t.after(() => app.close());
  const url = `http://127.0.0.1:${app.server.address().port}`;
  return { url, request: (route, options = {}) => new Promise((resolve, reject) => {
    const req = http.request(url + route, { method: options.method || 'GET',
      headers: { host: 'localhost:3000', ...options.headers } }, response => {
      response.resume(); response.on('end', () => resolve({ status: response.statusCode,
        headers: { get: name => response.headers[name] ?? null }, arrayBuffer: async () => {} }));
    });
    req.on('error', reject); req.end(options.body);
  }) };
}
test('real server serves assets, health, language catalog and restrictive headers', async t => {
  const { request } = await fixture(t);
  for (const route of ['/', '/style.css', '/script.js', '/health', '/config', '/languages/en.json', '/api/languages']) {
    const response = await request(route);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    await response.arrayBuffer();
  }
});
test('rejects foreign origins, rebinding, hidden files and traversal', async t => {
  const { request } = await fixture(t);
  for (const [route, options, expected] of [
    ['/health', { headers: { origin: 'https://evil.example' } }, 403],
    ['/health', { headers: { host: 'evil.example' } }, 403],
    ['/.env', {}, 404], ['/languages/%2e%2e%2fserver.js', {}, 404],
    ['/health', { method: 'POST', body: '{}' }, 405], ['/missing.json', {}, 404],
  ]) assert.equal((await request(route, options)).status, expected, route);
});
test('WebSocket refuses foreign origin and accepts same-origin read-only stream', async t => {
  const { url } = await fixture(t);
  const bad = new WebSocket(url.replace('http', 'ws') + '/ws', { origin: 'https://evil.example', headers: { host: 'localhost:3000' } });
  const [error] = await once(bad, 'error');
  assert.match(error.message, /403/);
  const ws = new WebSocket(url.replace('http', 'ws') + '/ws', { origin: 'http://localhost:3000', headers: { host: 'localhost:3000' } });
  const [data] = await once(ws, 'message');
  assert.equal(JSON.parse(data).valid, false);
  ws.send('private text');
  const [code] = await once(ws, 'close');
  assert.equal(code, 1008);
});
test('only finite normalized gaze values enter the UI', () => {
  assert.ok(validGaze({ type: 'gaze', valid: true, x: 0.5, y: 1 }));
  for (const x of [NaN, Infinity, -1, 2, '0.5']) assert.ok(!validGaze({ type: 'gaze', valid: true, x, y: 0 }));
});
