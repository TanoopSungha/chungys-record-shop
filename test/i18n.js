// Language checks: every dictionary matches English key for key, nothing is empty,
// placeholders survive translation, the picker offers exactly our six languages, and missing keys fall back to English.
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const SRC = path.join(__dirname, '..', 'src');
const CODES = ['en', 'fr', 'de', 'es', 'hi', 'zh-Hans'];

for (const c of CODES) require(path.join(SRC, 'i18n', c + '.js'));
require(path.join(SRC, 'i18n.js'));
const I = globalThis.CRS_I18N, DICTS = globalThis.CRS_I18N_DICTS;

// the picker
assert.deepStrictEqual(I.LANGS.map(l => l.code), CODES, 'picker lists exactly the six languages, in order');
assert.deepStrictEqual(I.LANGS.map(l => l.name), ['English', 'Français', 'Deutsch', 'Español', 'हिन्दी', '简体中文'], 'native names');
assert.deepStrictEqual(Object.keys(DICTS).sort(), CODES.slice().sort(), 'one dictionary per language');

// keys, empties, placeholders
const ph = s => (s.match(/\{(\w+)\}/g) || []).sort();
const tags = s => (s.match(/<\/?\w+/g) || []).sort();
const en = DICTS.en, enKeys = Object.keys(en);
assert(enKeys.length > 300, 'English dictionary looks complete');
for (const k of enKeys) assert(typeof en[k] === 'string' && en[k].trim(), `en: empty ${k}`);
let problems = [];
for (const c of CODES.slice(1)) {
  const d = DICTS[c];
  for (const k of enKeys) {
    if (!(k in d)) { problems.push(`${c}: missing ${k}`); continue; }
    if (typeof d[k] !== 'string' || !d[k].trim()) { problems.push(`${c}: empty ${k}`); continue; }
    const want = [...new Set(ph(en[k]))], got = new Set(ph(d[k]));
    for (const p of want) if (!got.has(p)) problems.push(`${c}: ${k} lost ${p}`);
    for (const p of got) if (!want.includes(p)) problems.push(`${c}: ${k} has unknown ${p}`);
    if (tags(en[k]).join() !== tags(d[k]).join()) problems.push(`${c}: ${k} HTML tags differ`);
  }
  for (const k of Object.keys(d)) if (!(k in en)) problems.push(`${c}: unknown key ${k}`);
}
assert.deepStrictEqual(problems, [], 'dictionary problems:\n' + problems.join('\n'));

// every key the code asks for exists in English (catches typos in t('...') calls)
const code = ['ui.js', 'engine.js', 'art.js'].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
const literal = [...code.matchAll(/\b(?:tr|tn|tx|M)\('([a-zA-Z][\w.]*)'/g)].map(m => m[1]);
for (const k of literal) {
  if (k.endsWith('.')) continue; // a prefix built on at runtime
  assert(k in en || (k + '.one') in en, `code uses unknown key ${k}`);
}
// keys built from game data
const D = (require(path.join(SRC, 'data.js')), globalThis.CRS_DATA);
for (const g of D.GENRE_IDS) for (let i = 0; i < D.GENRES[g].clues; i++) assert(`clue.${g}.${i}` in en, `clue.${g}.${i}`);
for (const m of Object.keys(D.MOODS)) { assert(`moodTag.${m}` in en); for (let i = 0; i < D.MOODS[m]; i++) assert(`mood.${m}.${i}` in en, `mood.${m}.${i}`); }
for (const e of D.ERAS) assert(`era.${e}` in en && `eraTag.${e}` in en, e);
for (const r of Object.keys(D.RARITY)) assert(`rarity.${r}` in en);
for (const l of D.LOTS) assert(`lot.${l.id}.name` in en && `lot.${l.id}.blurb` in en, l.id);
for (const u of D.UPGRADES) assert(`up.${u.id}.name` in en && `up.${u.id}.desc` in en, u.id);
for (const R of D.REGULARS) { for (let i = 0; i < 5; i++) assert(`reg.${R.id}.${i}` in en); assert(`perk.${R.perk.id}.name` in en && `perk.${R.perk.id}.desc` in en); }
for (const g of D.GOALS) assert(`goal.${g.id}` in en || `goal.${g.id}.one` in en, g.id);
for (const e of ['rsd', 'payday', 'rain', 'festival']) assert(`event.${e}.name` in en);

// fallback: a key missing from a translation shows English, never the raw key
I.setLang('de');
assert.strictEqual(I.getLang(), 'de');
assert.strictEqual(I.t('lang.label'), 'Sprache');
DICTS.en['test.onlyEnglish'] = 'Only in English, {name}';
assert.strictEqual(I.t('test.onlyEnglish', { name: 'Wax' }), 'Only in English, Wax', 'falls back to English');
delete DICTS.en['test.onlyEnglish'];
assert.strictEqual(I.t('no.such.key'), '', 'unknown key never shows the raw key');
// nested message specs and plurals
assert.strictEqual(I.resolve({ k: 'req.genreEra', v: { genre: 'Rock', era: { k: 'era.70s' } } }), 'Hast du Rock aus den Siebzigern?');
I.setLang('en');
assert.strictEqual(I.tn('lot.records', 1), '1 record');
assert.strictEqual(I.tn('lot.records', 7), '7 records');
assert.strictEqual(I.money(1234), '£1,234');
I.setLang('xx');
assert.strictEqual(I.getLang(), 'en', 'unknown code goes to English');

// first-run detection from the browser languages
assert.strictEqual(I.match('fr-CA'), 'fr');
assert.strictEqual(I.match('de-AT'), 'de');
assert.strictEqual(I.match('es-419'), 'es');
assert.strictEqual(I.match('hi-IN'), 'hi');
for (const z of ['zh', 'zh-CN', 'zh-SG', 'zh-Hans', 'zh-Hans-CN']) assert.strictEqual(I.match(z), 'zh-Hans', z);
assert.strictEqual(I.match('zh-TW'), null);
assert.strictEqual(I.match('ja'), null);

console.log(`i18n: ${CODES.length} languages, ${enKeys.length} keys each, all placeholders intact`);
