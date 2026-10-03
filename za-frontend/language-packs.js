'use strict';
const fs = require('node:fs');
const path = require('node:path');
const CODE = /^[a-z]{2,3}(?:-[A-Za-z0-9]+)*$/;
function validatePack(pack, filename, referenceKeys = []) {
  if (pack.schemaVersion !== 1 || !CODE.test(pack.code) || filename !== `${pack.code}.json`) throw new Error(`Invalid pack identity: ${filename}`);
  if (typeof pack.name !== 'string' || !pack.name.trim() || pack.name.length > 80) throw new Error(`Invalid name: ${filename}`);
  try { new Intl.Locale(pack.locale); } catch { throw new Error(`Invalid locale: ${filename}`); }
  if (!['ltr','rtl'].includes(pack.direction)) throw new Error(`Invalid direction: ${filename}`);
  const validKey = key => typeof key === 'string' && key.length > 0 && key.length <= 16 && !/[<>\x00-\x1f]/.test(key);
  if (!Array.isArray(pack.keyboard) || !pack.keyboard.length || pack.keyboard.length > 12 || pack.keyboard.some(row => !Array.isArray(row) || !row.length || row.length > 80 || row.some(key => !validKey(key)))) throw new Error(`Invalid keyboard: ${filename}`);
  if (!Array.isArray(pack.keyboardPages) || pack.keyboardPages.length > 10 || pack.keyboardPages.some(page => !Array.isArray(page) || page.length > 80 || page.some(key => !validKey(key)))) throw new Error(`Invalid keyboard pages: ${filename}`);
  if (!Array.isArray(pack.phrases) || pack.phrases.length < 1 || pack.phrases.length > 24 || pack.phrases.some(value => typeof value !== 'string' || !value.trim() || value.length > 200)) throw new Error(`Invalid phrases: ${filename}`);
  if (!pack.ui || referenceKeys.some(key => typeof pack.ui[key] !== 'string' || !pack.ui[key].trim())) throw new Error(`Missing UI strings: ${filename}`);
  if (Object.values(pack.ui).some(value => typeof value !== 'string' || value.length > 500)) throw new Error(`Invalid UI string: ${filename}`);
  if (pack.speech?.locale !== pack.locale || (pack.speech.piperVoice !== null && !/^[A-Za-z0-9_-]{1,100}$/.test(pack.speech.piperVoice))) throw new Error(`Invalid speech metadata: ${filename}`);
  return pack;
}
function loadPacks(directory) {
  const reference = JSON.parse(fs.readFileSync(path.join(directory, 'en.json'), 'utf8'));
  return fs.readdirSync(directory).filter(name => CODE.test(name.replace(/\.json$/, '')) && name.endsWith('.json')).map(filename =>
    validatePack(JSON.parse(fs.readFileSync(path.join(directory, filename), 'utf8')), filename, Object.keys(reference.ui)));
}
if (require.main === module) console.log(`Validated ${loadPacks(path.join(__dirname, 'languages')).length} language packs`);
module.exports = { validatePack, loadPacks };
