const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { createApplication } = require('../server');
const { createSpeechHandler } = require('../speech');
const { loadPacks, validatePack } = require('../language-packs');
const path = require('node:path');
async function fixture(t, fetchImpl) {
  const app = createApplication({ origins: ['http://localhost:3000'], handleRequest: createSpeechHandler({
    endpoint: 'http://127.0.0.1:5000/synthesize', voices: { en: 'en_US-lessac-medium' }, fetchImpl }) });
  app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening'); t.after(() => app.close());
  return body => new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: app.server.address().port, path: '/api/speech', method: 'POST',
      headers: { Host: 'localhost:3000', Origin: 'http://localhost:3000', 'Content-Type': 'application/json' } }, res => {
      const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    }); req.on('error', reject); req.end(typeof body === 'string' ? body : JSON.stringify(body));
  });
}
test('speech validates input and forwards only the configured voice', async t => {
  let calls = 0;
  const request = await fixture(t, async (endpoint, options) => {
    calls++; assert.equal(endpoint, 'http://127.0.0.1:5000/synthesize');
    assert.equal(JSON.parse(options.body).voice, 'en_US-lessac-medium');
    assert.equal(options.redirect, 'error');
    const wav = Buffer.alloc(44); wav.write('RIFF'); wav.write('WAVE', 8);
    return new Response(wav, { status: 200 });
  });
  for (const body of ['invalid', { text: 'hi', language: '../../etc/passwd', rate: 1 },
    { text: 'a'.repeat(2001), language: 'en', rate: 1 }, { text: 'hi', language: 'en', rate: 99 }]) {
    assert.equal((await request(body)).status, 400);
  }
  assert.equal(calls, 0);
  assert.equal((await request('a'.repeat(13000))).status, 413);
  const valid = await request({ text: 'Hello', language: 'en', rate: .9 });
  assert.equal(valid.status, 200); assert.equal(valid.body.toString('ascii', 0, 4), 'RIFF'); assert.equal(calls, 1);
});
test('speech rejects non-audio upstream responses without leaking internals', async t => {
  const request = await fixture(t, async () => new Response('secret error page'));
  const response = await request({ text: 'Hello', language: 'en', rate: 1 });
  assert.equal(response.status, 502); assert.ok(!response.body.toString().includes('secret'));
});
test('speech concurrency is bounded and recovers after completion', async t => {
  let release, entered;
  const started = new Promise(resolve => { entered = resolve; });
  const request = await fixture(t, async () => { entered(); await new Promise(resolve => { release = resolve; }); return new Response('bad'); });
  const first = request({ text: 'Hello', language: 'en', rate: 1 }); await started;
  assert.equal((await request({ text: 'Second', language: 'en', rate: 1 })).status, 429);
  release(); assert.equal((await first).status, 502);
});
test('packs include all requested languages and reject malformed extensions', () => {
  const packs = loadPacks(path.join(__dirname, '../languages'));
  for (const code of ['en','fr','zh','it','si','el']) assert.ok(packs.some(pack => pack.code === code));
  const reference = packs.find(pack => pack.code === 'en');
  assert.throws(() => validatePack({ ...reference, code: '../secret' }, '../secret.json'));
  assert.throws(() => validatePack({ ...reference, keyboard: [['<script>']] }, 'en.json'));
  assert.throws(() => validatePack({ ...reference, ui: {} }, 'en.json', Object.keys(reference.ui)));
});
