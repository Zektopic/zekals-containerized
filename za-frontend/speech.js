'use strict';
/** Fixed local Piper endpoint, configured voice allowlist, bounded audio and concurrency. */
function createSpeechHandler({ endpoint = '', voices = {}, fetchImpl = fetch } = {}) {
  if (endpoint) {
    const url = new URL(endpoint);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid speech endpoint');
  }
  for (const [language, voice] of Object.entries(voices)) {
    if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]+)*$/.test(language) || !/^[A-Za-z0-9_-]{1,100}$/.test(voice)) throw new Error('Invalid configured voice');
  }
  let busy = false;
  return async (req, res, url, json) => {
    if (url.pathname === '/api/speech/config' && req.method === 'GET') {
      json(res, 200, { enabled: Boolean(endpoint), languages: endpoint ? Object.keys(voices) : [] }); return true;
    }
    if (url.pathname !== '/api/speech') return false;
    if (req.method !== 'POST') { req.resume(); json(res, 405, { error: 'Use POST' }); return true; }
    if (!req.headers.origin || !req.headers['content-type']?.startsWith('application/json')) { req.resume(); json(res, 415, { error: 'Same-origin JSON required' }); return true; }
    if (!endpoint) { req.resume(); json(res, 503, { error: 'Neural speech is not configured' }); return true; }
    if (busy) { req.resume(); json(res, 429, { error: 'Speech engine is busy' }); return true; }
    busy = true;
    const controller = new AbortController();
    const cancel = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', cancel);
    try {
      let size = 0, chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 12000) { json(res, 413, { error: 'Message too large' }); return true; }
        chunks.push(chunk);
      }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { json(res, 400, { error: 'Invalid JSON' }); return true; }
      if (!body || typeof body.text !== 'string' || !body.text.trim() || body.text.length > 2000 ||
          !Object.hasOwn(voices, body.language) || !Number.isFinite(body.rate) || body.rate < .5 || body.rate > 1.5) {
        json(res, 400, { error: 'Invalid text, language or speech speed' }); return true;
      }
      const response = await fetchImpl(endpoint, { method: 'POST', redirect: 'error',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: body.text, voice: voices[body.language], length_scale: 1 / body.rate }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) });
      if (!response.ok || !response.body) throw new Error('Speech unavailable');
      size = 0; chunks = [];
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > 12 * 1024 * 1024) { controller.abort(); throw new Error('Audio limit'); }
        chunks.push(chunk);
      }
      const audio = Buffer.concat(chunks);
      if (audio.length < 44 || audio.toString('ascii', 0, 4) !== 'RIFF' || audio.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Invalid audio');
      res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': audio.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(audio);
    } catch {
      if (!res.headersSent && !res.destroyed) json(res, 502, { error: 'Speech engine unavailable; use a device voice or retry' });
    } finally { busy = false; res.off('close', cancel); }
    return true;
  };
}
module.exports = { createSpeechHandler };
