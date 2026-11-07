// Chungy's Record Shop: languages. Same shape in every Snoopster game.
// Dictionaries live in i18n/<code>.js and register themselves on CRS_I18N_DICTS.
(function (G) {
  'use strict';
  const STORE_KEY = 'chungys-record-shop-lang';
  const LANGS = [
    { code: 'en', name: 'English', locale: 'en-GB', html: 'en-GB' },
    { code: 'fr', name: 'Français', locale: 'fr-FR', html: 'fr' },
    { code: 'de', name: 'Deutsch', locale: 'de-DE', html: 'de' },
    { code: 'es', name: 'Español', locale: 'es-ES', html: 'es' },
    { code: 'hi', name: 'हिन्दी', locale: 'hi-IN', html: 'hi' },
    { code: 'zh-Hans', name: '简体中文', locale: 'zh-Hans-CN', html: 'zh-Hans' },
  ];
  const CODES = LANGS.map(l => l.code);
  // Our display fonts only carry Latin glyphs, so Devanagari and Chinese fall through to these.
  const FONT_FALLBACK = '"Noto Sans Devanagari", "Nirmala UI", "Kohinoor Devanagari", "Noto Sans SC", "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif';

  const dicts = () => G.CRS_I18N_DICTS || {};
  let lang = null;

  function store() { try { return G.localStorage || null; } catch (e) { return null; } }

  // Map a browser language tag to one of ours (or null).
  function match(tag) {
    if (!tag) return null;
    const t = String(tag).toLowerCase();
    if (t === 'zh' || t.startsWith('zh-cn') || t.startsWith('zh-sg') || t.startsWith('zh-hans')) return 'zh-Hans';
    for (const c of ['fr', 'de', 'es', 'hi', 'en']) if (t === c || t.startsWith(c + '-')) return c;
    return null;
  }
  function detect() {
    const nav = G.navigator;
    const list = nav ? (nav.languages && nav.languages.length ? nav.languages : [nav.language]) : [];
    for (const tag of list) { const m = match(tag); if (m) return m; }
    return 'en';
  }

  function getLang() {
    if (lang) return lang;
    let saved = null;
    try { const s = store(); saved = s && s.getItem(STORE_KEY); } catch (e) { saved = null; }
    lang = CODES.includes(saved) ? saved : detect();
    return lang;
  }
  const info = code => LANGS.find(l => l.code === (code || getLang())) || LANGS[0];
  const locale = () => info().locale;

  function setLang(code) {
    if (!CODES.includes(code)) code = 'en';
    const changed = code !== getLang();
    lang = code;
    try { const s = store(); if (s) s.setItem(STORE_KEY, code); } catch (e) { /* storage may be blocked */ }
    if (G.document) { G.document.documentElement.lang = info().html; if (G.document.body) applyDom(G.document); }
    if (changed && typeof G.dispatchEvent === 'function' && typeof G.CustomEvent === 'function') G.dispatchEvent(new G.CustomEvent('langchange', { detail: { lang: code } }));
    return code;
  }

  // English fallback; if even English lacks it, show something readable rather than a raw key.
  function raw(key, code) {
    const d = dicts()[code || getLang()];
    if (d && typeof d[key] === 'string' && d[key] !== '') return d[key];
    const en = dicts().en;
    if (en && typeof en[key] === 'string') return en[key];
    return null;
  }
  function fill(s, vars) {
    if (!vars) return s;
    return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(resolve(vars[k])) : m));
  }
  function t(key, vars) {
    const s = raw(key);
    if (s == null) return '';
    return fill(s, vars);
  }
  // Counts: picks key.one / key.other using the language's plural rules. {n} is the formatted number.
  function tn(key, n, vars) {
    let cat = 'other';
    try { cat = new Intl.PluralRules(locale()).select(n) === 'one' ? 'one' : 'other'; } catch (e) { cat = n === 1 ? 'one' : 'other'; }
    return t(key + '.' + cat, Object.assign({ n: num(n) }, vars || {}));
  }
  // A message spec is { k: key, v: { ...vars, which may be specs too } } or a plain string.
  function resolve(x) {
    if (x == null) return '';
    if (typeof x === 'object' && x.k) return x.cap ? capFirst(t(x.k, x.v)) : t(x.k, x.v);
    return x;
  }
  const capFirst = s => s ? s.charAt(0).toLocaleUpperCase(locale()) + s.slice(1) : s;
  const has = key => raw(key) != null;

  // ---------- formatting ----------
  const nf = {};
  function num(n) { const l = locale(); try { nf[l] = nf[l] || new Intl.NumberFormat(l); return nf[l].format(n); } catch (e) { return String(n); } }
  const mf = {};
  function money(n) {
    const l = locale();
    try { mf[l] = mf[l] || new Intl.NumberFormat(l, { style: 'currency', currency: 'GBP', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0, minimumFractionDigits: 0 }); return mf[l].format(Math.round(n)); }
    catch (e) { return '£' + Math.round(n); }
  }
  function list(items) { try { return new Intl.ListFormat(locale(), { style: 'short', type: 'conjunction' }).format(items); } catch (e) { return items.join(', '); } }

  // ---------- DOM ----------
  function applyDom(root) {
    root = root || G.document; if (!root || !root.querySelectorAll) return;
    for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
    for (const el of root.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
    for (const el of root.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = t(el.dataset.i18nPlaceholder);
    for (const el of root.querySelectorAll('[data-i18n-aria-label]')) el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
  }

  G.CRS_I18N = { LANGS, CODES, FONT_FALLBACK, STORE_KEY, t, tn, has, resolve, capFirst, getLang, setLang, applyDom, match, detect, locale, num, money, list, info,
    _reset() { lang = null; } };
  if (G.document) G.document.documentElement.lang = info().html;
})(typeof window !== 'undefined' ? window : globalThis);
