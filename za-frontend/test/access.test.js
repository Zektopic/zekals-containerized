const { test } = require('node:test');
const assert = require('node:assert/strict');
test('dwell activates once, cancels on loss and restarts on new target', async () => {
  const { Dwell } = await import('../public/access.mjs');
  const dwell = new Dwell(1000);
  assert.equal(dwell.update('A', 0).activate, false);
  assert.equal(dwell.update('A', 1000).activate, true);
  assert.equal(dwell.update('A', 2000).activate, false);
  dwell.update(null, 2100);
  assert.equal(dwell.update('A', 2200).activate, false);
  assert.equal(dwell.update('B', 3300).activate, false);
  assert.equal(dwell.update('B', 4300).activate, true);
});
test('backspace preserves grapheme clusters, including Sinhala and emoji', async () => {
  const { removeLastGrapheme } = await import('../public/access.mjs');
  for (const suffix of ['é', 'e\u0301', '👩🏽‍💻', 'සි']) assert.equal(removeLastGrapheme('abc' + suffix), 'abc');
});
test('calibration fits affine coordinates and rejects motionless input', async () => {
  const { fitCalibration, mapGaze } = await import('../public/access.mjs');
  const targets = [[.1,.1],[.9,.1],[.5,.5],[.1,.9],[.9,.9]];
  const fit = fitCalibration(targets.map(target => ({ target, raw: target.map(v => v / 2 + .2) })));
  const result = mapGaze(fit, .45, .45); result.forEach(value => assert.ok(Math.abs(value - .5) < 1e-8));
  assert.throws(() => fitCalibration(targets.map(target => ({ target, raw: [.5,.5] }))));
});
