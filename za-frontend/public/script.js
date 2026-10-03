import { Dwell, removeLastGrapheme, fitCalibration, mapGaze } from './access.mjs';
import { NeuralSpeech } from './speech.mjs';
const $ = id => document.getElementById(id);
const defaults = { language: 'en', dwell: 1200, scan: 1400, large: false, contrast: false, rate: 0.9, voice: '', engine: 'device' };
let saved = {};
try { saved = JSON.parse(localStorage.getItem('zekals.preferences') || '{}'); } catch { /* Storage may be disabled. */ }
const settings = { ...defaults, ...saved };
for (const [key, min, max] of [['dwell', 500, 3000], ['scan', 600, 4000], ['rate', 0.5, 1.5]]) {
  settings[key] = Number.isFinite(settings[key]) ? Math.max(min, Math.min(max, settings[key])) : defaults[key];
}
let pack, catalog = [], voices = [], voiceIndex = -1, keyboardPage = 0, mode = 'manual', paused = false;
let lastValue = '', history = [], pointerTarget = null, gazeTarget = null, highlighted = null;
let tracked = false, lastGaze = 0, rawGaze = null, calibration = null, calibrationRun = null;
let scanIndex = -1, scanned = null, lastScan = 0, socket, reconnectTimer, reconnectAttempt = 0;
let languageRequest = 0, blockedTarget = null, pointerX = 0, pointerY = 0, composing = false;
const dwell = new Dwell(settings.dwell);
const notices = text => { $('notice').textContent = text; };
const neuralSpeech = new NeuralSpeech(notices);
const tr = (key, fallback) => pack?.ui?.[key] || fallback;
const save = () => { try { localStorage.setItem('zekals.preferences', JSON.stringify(settings)); } catch { /* Session still works. */ } };
const allButtons = () => [...(document.querySelector('dialog[open]') || document).querySelectorAll('button')]
  .filter(button => !button.disabled && button.getClientRects().length && (!paused || button.id === 'pause'));
function resetDwell() {
  if (highlighted) { highlighted.classList.remove('dwell-target'); highlighted.style.removeProperty('--dwell-progress'); }
  highlighted = null; dwell.reset();
}
function resetScan() {
  scanned?.classList.remove('scan-target'); scanned = null; scanIndex = -1; lastScan = 0;
}
function record(value) {
  if (value === lastValue) return;
  history.push(lastValue); if (history.length > 30) history.shift();
  lastValue = value; if ($('message').value !== value) $('message').value = value; updateCount();
}
function updateCount() { $('character-count').textContent = `${$('message').value.length} / 2000`; }
function append(text) {
  const input = $('message'), start = input.selectionStart, end = input.selectionEnd;
  const value = input.value.slice(0, start) + text + input.value.slice(end);
  if (value.length > 2000) { notices(tr('messageFull', 'Your message is full. Speak or clear it before adding more.')); return; }
  record(value); input.setSelectionRange(start + text.length, start + text.length);
}
function makeButton(label, action) {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
  button.addEventListener('click', action); return button;
}
function renderPack() {
  resetDwell(); resetScan(); document.documentElement.lang = pack.locale || pack.code;
  document.documentElement.dir = pack.direction || 'ltr';
  $('language-label').textContent = pack.name; $('language-next').textContent = `${pack.name} ›`;
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const value = pack.ui?.[element.dataset.i18n]; if (value) element.textContent = value;
  });
  $('message').placeholder = pack.ui?.textPlaceholder || 'Type here, choose a phrase, or use the keyboard below.';
  $('keyboard-page').textContent = `${tr('moreKeys', 'More characters')} › ${keyboardPage + 1}/${(pack.keyboardPages?.length || 0) + 2}`;
  $('keyboard').replaceChildren();
  const pages = [pack.keyboard.flat(), ...(pack.keyboardPages || []), [...'1234567890.,?!:;+-=()@']];
  const keys = pages[keyboardPage] || pages[0];
  keys.forEach(key => $('keyboard').append(makeButton(key === '\u200d' ? tr('joinLetters', 'Join letters') : /^\p{M}+$/u.test(key) ? '◌' + key : key, () => append(key))));
  $('phrases').replaceChildren();
  const phrases = pack.phrases || ['Yes', 'No', 'Thank you', 'I need help', 'I need water', 'Please wait', 'I am uncomfortable', 'I love you'];
  phrases.forEach(phrase => $('phrases').append(makeButton(phrase, () => append(($('message').value ? ' ' : '') + phrase))));
  syncPreferences(); refreshVoices();
}
async function loadLanguage(code) {
  const request = ++languageRequest;
  try {
    const response = await fetch(`/languages/${encodeURIComponent(code)}.json`);
    if (!response.ok) throw new Error('Unavailable language');
    const next = await response.json();
    if (request !== languageRequest) return;
    pack = next; settings.language = code; keyboardPage = 0; save(); renderPack();
  } catch { notices('Language could not be loaded. Your current message is still here.'); }
}
function syncPreferences() {
  document.body.classList.toggle('large', Boolean(settings.large));
  document.body.classList.toggle('high-contrast', Boolean(settings.contrast));
  $('text-size').textContent = settings.large ? tr('large', 'Large') : tr('standard', 'Standard');
  $('contrast').textContent = settings.contrast ? tr('highContrast', 'High contrast') : tr('dark', 'Dark');
  $('dwell-label').textContent = `${tr('dwellTime', 'Dwell time')}: ${(settings.dwell / 1000).toFixed(1)} s`;
  $('scan-label').textContent = `${tr('scanTime', 'Scan interval')}: ${(settings.scan / 1000).toFixed(1)} s`;
  $('rate-label').textContent = `${tr('speechSpeed', 'Speech speed')}: ${settings.rate.toFixed(1)}×`;
  $('pause').textContent = paused ? tr('resume', 'Resume selection') : tr('pause', 'Pause selection');
  $('speech-engine').textContent = settings.engine === 'neural' ? tr('neuralVoice', 'Local neural voice') : tr('deviceVoice', 'Device voice');
  dwell.duration = settings.dwell;
}
function refreshVoices() {
  const language = (pack?.locale || settings.language).split('-')[0].toLowerCase();
  voices = (window.speechSynthesis?.getVoices() || []).filter(voice => voice.lang.toLowerCase().split('-')[0] === language && voice.localService);
  voiceIndex = voices.findIndex(voice => voice.voiceURI === settings.voice);
  if (voiceIndex < 0 && voices.length) voiceIndex = 0;
  $('voice-next').textContent = voices[voiceIndex]?.name || tr('noVoice', 'No local voice installed');
}
function stopSpeaking() { window.speechSynthesis?.cancel(); neuralSpeech.stop(); }
function speak() {
  const text = $('message').value.trim(); if (!text) { notices(tr('emptyMessage', 'Write a message first.')); return; }
  stopSpeaking();
  if (settings.engine === 'neural') { neuralSpeech.speak(text, pack, settings.rate); return; }
  if (!window.speechSynthesis || !voices[voiceIndex]) { notices(tr('installVoice', 'Install an offline voice for this language in device settings.')); return; }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = pack.locale || pack.code; utterance.voice = voices[voiceIndex]; utterance.rate = settings.rate;
  utterance.onerror = event => { if (!['interrupted', 'canceled'].includes(event.error)) notices(tr('speechFailed', 'Speech could not start. Check your device voice and volume.')); };
  utterance.onend = () => notices(tr('ready', 'Ready when you are.'));
  speechSynthesis.speak(utterance); notices(tr('speaking', 'Speaking…'));
}
function setPaused(value) {
  paused = value; resetDwell(); document.body.classList.toggle('paused', paused);
  $('pause').setAttribute('aria-pressed', String(paused)); syncPreferences();
  notices(paused ? tr('paused', 'Automatic selection paused. Touch and keyboard still work.') : tr('ready', 'Ready when you are.'));
}
function setMode(value) {
  mode = value; pointerTarget = gazeTarget = null; resetDwell(); resetScan();
  document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
  $('mode-hint').textContent = ({ manual: tr('manualHint', 'Use a mouse, touch, or keyboard. Change access mode in Settings.'),
    dwell: tr('dwellHint', 'Hold the pointer over a button to choose it. Move away before choosing again.'),
    scan: tr('scanHint', 'Press Space to choose the highlighted button. Escape pauses scanning.'),
    gaze: tr('gazeHint', 'Calibrate in Settings before choosing buttons with your eyes.') })[mode];
}
$('message').addEventListener('compositionstart', () => { composing = true; });
$('message').addEventListener('compositionend', () => { composing = false; record($('message').value); });
$('message').addEventListener('input', () => { if (!composing) record($('message').value); else updateCount(); });
$('speak').onclick = speak; $('stop').onclick = () => { stopSpeaking(); notices(tr('stopped', 'Speech stopped.')); };
$('clear').onclick = () => { record(''); notices(tr('cleared', 'Message cleared. Undo restores it.')); };
$('undo').onclick = () => { if (history.length) { lastValue = history.pop(); $('message').value = lastValue; updateCount(); } };
$('scroll-up').onclick = () => window.scrollBy({ top: -innerHeight * .6, behavior: 'instant' });
$('scroll-down').onclick = () => window.scrollBy({ top: innerHeight * .6, behavior: 'instant' });
$('space').onclick = () => append(' ');
$('backspace').onclick = () => {
  const input = $('message'), start = input.selectionStart, end = input.selectionEnd;
  const left = start === end ? removeLastGrapheme(input.value.slice(0, start), pack?.locale) : input.value.slice(0, start);
  record(left + input.value.slice(end)); input.setSelectionRange(left.length, left.length);
};
$('keyboard-page').onclick = () => { keyboardPage = (keyboardPage + 1) % ((pack.keyboardPages?.length || 0) + 2); renderPack(); };
$('language-next').onclick = () => {
  const index = catalog.findIndex(language => language.code === settings.language);
  if (catalog.length) loadLanguage(catalog[(index + 1) % catalog.length].code);
};
$('pause').onclick = () => setPaused(!paused);
$('settings-open').onclick = () => { resetDwell(); resetScan(); $('settings').showModal(); };
$('settings-close').onclick = () => { resetDwell(); resetScan(); $('settings').close(); };
$('settings').addEventListener('close', () => { resetDwell(); resetScan(); });
$('settings').addEventListener('cancel', () => setPaused(true));
for (const button of document.querySelectorAll('[data-mode]')) button.onclick = () => setMode(button.dataset.mode);
for (const [id, key, delta, min, max] of [['dwell-less','dwell',-100,500,3000],['dwell-more','dwell',100,500,3000],
  ['scan-less','scan',-200,600,4000],['scan-more','scan',200,600,4000],['rate-less','rate',-.1,.5,1.5],['rate-more','rate',.1,.5,1.5]]) {
  $(id).onclick = () => { settings[key] = Math.round(Math.max(min, Math.min(max, settings[key] + delta)) * 10) / 10; syncPreferences(); save(); };
}
$('text-size').onclick = () => { settings.large = !settings.large; syncPreferences(); save(); };
$('contrast').onclick = () => { settings.contrast = !settings.contrast; syncPreferences(); save(); };
$('speech-engine').onclick = () => { stopSpeaking(); settings.engine = settings.engine === 'neural' ? 'device' : 'neural'; syncPreferences(); save(); };
$('voice-next').onclick = () => { if (voices.length) { voiceIndex = (voiceIndex + 1) % voices.length; settings.voice = voices[voiceIndex].voiceURI; save(); refreshVoices(); } };
window.speechSynthesis?.addEventListener('voiceschanged', refreshVoices);
document.addEventListener('pointermove', event => { pointerX = event.clientX; pointerY = event.clientY; pointerTarget = event.target.closest('button'); });
document.addEventListener('pointerout', event => { if (!event.relatedTarget) { pointerTarget = null; resetDwell(); } });
document.addEventListener('pointerdown', () => { resetDwell(); pointerTarget = null; });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { setPaused(true); stopSpeaking(); }
  if (mode === 'scan' && event.code === 'Space') {
    event.preventDefault();
    if (!event.repeat && !paused && !document.hidden && !calibrationRun && allButtons().includes(scanned)) { scanned.click(); lastScan = performance.now(); }
    else if (!event.repeat && paused) setPaused(false);
  }
});
window.addEventListener('scroll', () => { pointerTarget = document.elementFromPoint(pointerX, pointerY)?.closest('button'); gazeTarget = null; resetDwell(); }, { passive: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) { setPaused(true); stopSpeaking(); } });
window.addEventListener('resize', () => { calibration = null; resetDwell(); });
function invalidateGaze() { tracked = false; gazeTarget = null; $('gaze-cursor').hidden = true; if (mode === 'gaze') resetDwell(); }
function connect() {
  socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`);
  socket.onopen = () => { reconnectAttempt = 0; };
  socket.onmessage = event => {
    let value; try { value = JSON.parse(event.data); } catch { return; }
    if (value.type !== 'gaze') return;
    if (!value.valid || !Number.isFinite(value.x) || !Number.isFinite(value.y) || value.x < 0 || value.x > 1 || value.y < 0 || value.y > 1) {
      invalidateGaze(); $('tracking-status').textContent = tr('pointerReady', 'Pointer ready · camera unavailable'); return;
    }
    tracked = true; lastGaze = performance.now(); rawGaze = [value.x, value.y];
    $('tracking-status').textContent = tr('cameraReady', 'Camera connected');
    if (calibrationRun && lastGaze - calibrationRun.started > 1500) calibrationRun.points.push(rawGaze);
    if (mode === 'gaze' && calibration) {
      const [nx, ny] = mapGaze(calibration, value.x, value.y);
      const x = Math.min(innerWidth - 1, nx * innerWidth), y = Math.min(innerHeight - 1, ny * innerHeight);
      $('gaze-cursor').hidden = false; $('gaze-cursor').style.left = `${x}px`; $('gaze-cursor').style.top = `${y}px`;
      gazeTarget = document.elementFromPoint(x, y)?.closest('button');
    }
  };
  socket.onclose = () => {
    invalidateGaze(); $('tracking-status').textContent = tr('pointerReady', 'Pointer ready · camera unavailable');
    reconnectTimer = setTimeout(connect, Math.min(30000, 500 * 2 ** Math.min(reconnectAttempt++, 6)));
  };
  socket.onerror = () => { invalidateGaze(); };
}
window.addEventListener('pagehide', () => { clearTimeout(reconnectTimer); socket.onclose = null; socket.close(); stopSpeaking(); });
const targets = [[.15,.18],[.85,.18],[.5,.5],[.15,.82],[.85,.82]];
function nextCalibration(index = 0, samples = []) {
  if (index === targets.length) {
    try { calibration = fitCalibration(samples); notices(tr('calibrated', 'Calibration saved for this window. Try the large phrase buttons first.')); setMode('gaze'); }
    catch (error) { calibration = null; notices(error.message); }
    calibrationRun = null; $('calibration').close(); return;
  }
  calibrationRun = { index, samples, points: [], started: performance.now() };
  const [x,y] = targets[index]; $('calibration-target').style.left = `${x * 100}%`; $('calibration-target').style.top = `${y * 100}%`;
  $('calibration-info').textContent = `${tr('lookTarget', 'Look at the target and hold still')}. ${index + 1} / 5`;
}
$('calibrate').onclick = () => {
  if (!tracked) { notices(tr('needCamera', 'Connect the camera service before calibration.')); return; }
  resetDwell(); $('settings').close(); $('calibration').showModal(); nextCalibration();
};
$('calibration-cancel').onclick = () => { calibrationRun = null; $('calibration').close(); resetDwell(); };
$('calibration').addEventListener('cancel', () => { calibrationRun = null; resetDwell(); });
function tick(now) {
  if (tracked && now - lastGaze > 400) invalidateGaze();
  if (calibrationRun && now - calibrationRun.started >= 3000) {
    const run = calibrationRun;
    if (!tracked || run.points.length < 5) { calibrationRun = null; $('calibration').close(); notices(tr('calibrationLost', 'Tracking lost during calibration. Please retry.')); }
    else {
      const raw = [0,1].map(axis => run.points.reduce((sum, point) => sum + point[axis], 0) / run.points.length);
      nextCalibration(run.index + 1, [...run.samples, { raw, target: targets[run.index] }]);
    }
  }
  if (mode === 'scan' && !paused && !document.hidden && !calibrationRun && now - lastScan >= settings.scan) {
    const buttons = allButtons(); scanned?.classList.remove('scan-target');
    scanIndex = (scanIndex + 1) % Math.max(1, buttons.length); scanned = buttons[scanIndex];
    scanned?.classList.add('scan-target'); scanned?.scrollIntoView({ block: 'nearest', behavior: 'instant' }); lastScan = now;
  } else if (mode !== 'scan' || paused) { scanned?.classList.remove('scan-target'); scanned = null; }
  let target = mode === 'dwell' ? pointerTarget : mode === 'gaze' && tracked && calibration ? gazeTarget : null;
  if (target !== blockedTarget) blockedTarget = null;
  if (target === blockedTarget || document.hidden || calibrationRun || !target?.isConnected || !target?.getClientRects().length || target?.disabled || (paused && target?.id !== 'pause') ||
    (document.querySelector('dialog[open]') && !target?.closest('dialog[open]'))) target = null;
  if (target !== highlighted) { resetDwell(); highlighted = target; }
  const state = dwell.update(target, now);
  if (target) {
    target.classList.add('dwell-target'); target.style.setProperty('--dwell-progress', `${state.progress * 100}%`);
    if (state.activate) { blockedTarget = target; target.click(); }
  }
  // Idle/manual access does no hit testing or inference. One timer also controls stale gaze.
  setTimeout(() => tick(performance.now()), mode === 'manual' && !calibrationRun ? 150 : 40);
}
async function init() {
  try { const response = await fetch('/api/languages'); catalog = await response.json(); } catch { catalog = [{ code: 'en', name: 'English' }]; }
  if (!catalog.some(item => item.code === settings.language)) settings.language = 'en';
  await neuralSpeech.load(); await loadLanguage(settings.language); syncPreferences(); connect(); tick(performance.now());
}
init();
