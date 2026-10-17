// Chungy's Record Shop: all music, sound effects and character voices are synthesised live (no audio files).
// Every record has its own groove: the genre sets the style, the record's seed sets the key, tempo and tune.
(function (G) {
  'use strict';
  const D = G.CRS_DATA;
  let ctx = null, master, comp, musicBus, sfxBus, voiceBus, lp, verb, crackleSrc = null;
  let musicVol = 0.6, sfxVol = 0.85, voiceVol = 0.85, muted = false;
  let cur = null, timer = null, nextT = 0, stepN = 0;
  let onBeat = null;
  let voiceTimer = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = G.AudioContext || G.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 3.5; comp.attack.value = 0.008; comp.release.value = 0.18;
    master.connect(comp); comp.connect(ctx.destination);

    lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9500; lp.Q.value = 0.45;
    musicBus = ctx.createGain(); musicBus.gain.value = musicVol * 0.58;
    musicBus.connect(lp); lp.connect(master);

    // Warm stereo slapback/room delay on music
    try {
      const dL = ctx.createDelay(0.5), dR = ctx.createDelay(0.5), fb = ctx.createGain(), vg = ctx.createGain(), vf = ctx.createBiquadFilter();
      dL.delayTime.value = 0.19; dR.delayTime.value = 0.27; fb.gain.value = 0.26; vg.gain.value = 0.18;
      vf.type = 'lowpass'; vf.frequency.value = 2600;
      lp.connect(vf); vf.connect(dL); dL.connect(dR); dR.connect(fb); fb.connect(dL);
      dL.connect(vg); dR.connect(vg); vg.connect(master);
      verb = vg;
    } catch (e) { /* fallback if delay fails */ }

    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxVol; sfxBus.connect(master);
    voiceBus = ctx.createGain(); voiceBus.gain.value = voiceVol; voiceBus.connect(master);
    return true;
  }

  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  let noiseBuf = null;
  function noise() {
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; return s;
  }
  function env(g, t, a, peak, dcy, sus, rel, len) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sus), t + a + dcy);
    if (len != null) { g.gain.setValueAtTime(Math.max(0.0001, peak * sus), t + len); g.gain.exponentialRampToValueAtTime(0.0001, t + len + rel); }
  }
  let distCurve = null;
  function dist() { if (!distCurve) { distCurve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; distCurve[i] = Math.tanh(x * 6); } } const w = ctx.createWaveShaper(); w.curve = distCurve; return w; }

  // ---------- instruments ----------
  function kick(t, v, out) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
    env(g, t, 0.002, v, 0.24, 0.001); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.3);
  }
  function snare(t, v, out, toneF) {
    const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = toneF || 1850; f.Q.value = 0.75;
    env(g, t, 0.001, v, 0.16, 0.001); n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + 0.2);
    const o = ctx.createOscillator(), g2 = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(130, t + 0.07);
    env(g2, t, 0.001, v * 0.55, 0.08, 0.001); o.connect(g2); g2.connect(out); o.start(t); o.stop(t + 0.1);
  }
  function hat(t, v, out, open) { const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 7200; env(g, t, 0.001, v, open ? 0.22 : 0.04, 0.001); n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + (open ? 0.3 : 0.06)); }
  function ride(t, v, out) { const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 5400; f.Q.value = 3.2; env(g, t, 0.001, v, 0.42, 0.001); n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + 0.45); }
  function tone(t, midi, len, v, out, type, cutoff, a, rel, detune) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type || 'sawtooth'; o.frequency.value = mtof(midi);
    if (detune) o.detune.value = detune;
    f.type = 'lowpass'; f.frequency.setValueAtTime((cutoff || 1300) * 1.25, t);
    f.frequency.exponentialRampToValueAtTime(cutoff || 1300, t + Math.min(0.15, len));
    env(g, t, a || 0.005, v, Math.max(0.02, len * 0.6), 0.6, rel || 0.08, len);
    o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + len + (rel || 0.08) + 0.05);
  }
  function rhodes(t, midi, len, v, out) {
    // Warm FM-like electric piano with bell overtone
    tone(t, midi, len, v * 0.85, out, 'sine', 2200, 0.004, 0.35);
    tone(t, midi + 12, Math.min(0.12, len * 0.4), v * 0.22, out, 'triangle', 3400, 0.002, 0.15, 4);
  }
  function chord(t, notes, len, v, out, type, cutoff, a, rel) {
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i], det = (i - 1) * 3.5;
      if (type === 'rhodes') rhodes(t, n, len, v / notes.length * 1.6, out);
      else tone(t, n, len, v / notes.length * 1.6, out, type, cutoff, a, rel, det);
    }
  }
  function power(t, root, len, v, out) { const d = dist(), g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2600; g.gain.value = v * 0.35; d.connect(f); f.connect(g); g.connect(out); for (const n of [root, root + 7, root + 12]) { const o = ctx.createOscillator(), e = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = (Math.random() - 0.5) * 12; env(e, t, 0.003, 0.5, len * 0.5, 0.7, 0.05, len); o.connect(e); e.connect(d); o.start(t); o.stop(t + len + 0.1); } }
  function pluck(t, midi, v, out) {
    tone(t, midi, 0.06, v, out, 'triangle', 2600, 0.002, 0.55);
    tone(t, midi + 12, 0.03, v * 0.3, out, 'sine', 3200, 0.001, 0.2);
  }

  // ---------- grooves ----------
  const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], penta: [0, 3, 5, 7, 10], mixo: [0, 2, 4, 5, 7, 9, 10] };
  const PROGS = { major: [[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 0, 4]], minor: [[0, 5, 6, 4], [0, 3, 4, 0], [0, 6, 5, 4]], dorian: [[0, 3, 0, 3], [0, 6, 3, 0]], mixo: [[0, 6, 3, 0], [0, 3, 6, 3]] };
  const STYLE = {
    rock: { scale: 'major', swing: 0, k: 'x...x...x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', bass: '8th', chords: 'power8', lead: 0.34 },
    punk: { scale: 'major', swing: 0, k: 'x.x.x.x.x.x.x.x.', s: '..x...x...x...x.', h: 'xxxxxxxxxxxxxxxx', bass: '8th', chords: 'power8', lead: 0.15 },
    metal: { scale: 'minor', swing: 0, k: 'xxxxxxxxxxxxxxxx', s: '....x.......x...', h: 'x...x...x...x...', bass: '16th', chords: 'chug', lead: 0.28 },
    soul: { scale: 'major', swing: 0.14, k: 'x......xx.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', bass: 'soul', chords: 'organ', lead: 0.52 },
    jazz: { scale: 'dorian', swing: 0.33, k: 'x.......x.......', s: '..........x.....', h: 'ride', bass: 'walk', chords: 'comp', lead: 0.58 },
    hiphop: { scale: 'minor', swing: 0.22, k: 'x.....x...x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', bass: 'boom', chords: 'rhodes', lead: 0.3, dusty: true },
    reggae: { scale: 'major', swing: 0.12, k: '........x.......', s: '........x.......', h: '..x...x...x...x.', bass: 'reggae', chords: 'skank', lead: 0.25 },
    house: { scale: 'minor', swing: 0, k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', bass: 'house', chords: 'stab', lead: 0.26, openHat: true },
    disco: { scale: 'mixo', swing: 0, k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', bass: 'octave', chords: 'strings', lead: 0.4, openHat: true },
    folk: { scale: 'major', swing: 0.15, k: 'x.......x.......', s: '....x.......x...', h: '.x.x.x.x.x.x.x.x', bass: 'root', chords: 'arp', lead: 0.62 },
  };

  function makeGroove(rec) {
    const st = STYLE[rec.genre] || STYLE.rock, r = D.rng((rec.seed || 1) + 17);
    const g = D.GENRES[rec.genre];
    const key = 36 + Math.floor(r() * 9);
    const prog = D.pick(r, PROGS[st.scale] || PROGS.major);
    const bpm = Math.round(g.bpm * (0.94 + r() * 0.12));
    // Structured 4-bar call-and-response melody so songs sound musical and memorable
    const scale = SCALES[st.scale === 'major' || st.scale === 'mixo' ? 'major' : 'penta'];
    const phraseA = [], phraseB = [];
    let curDeg = Math.floor(r() * 4);
    for (let i = 0; i < 16; i++) {
      const rest = (i % 4 === 3 && r() < 0.6) || r() > (st.lead || 0.35) * 0.85;
      if (rest) { phraseA.push(null); phraseB.push(null); continue; }
      curDeg = Math.max(0, Math.min(scale.length + 2, curDeg + (r() < 0.5 ? 1 : -1) * (r() < 0.25 ? 2 : 1)));
      const nA = scale[curDeg % scale.length] + (curDeg >= scale.length ? 12 : 0);
      const nB = i >= 12 ? scale[0] : (scale[(curDeg + (i % 2 ? 1 : 0)) % scale.length] + (curDeg >= scale.length ? 12 : 0));
      phraseA.push(nA); phraseB.push(nB);
    }
    const tune = phraseA.concat(phraseB);
    return { rec, st, key, prog, bpm, tune, scale: SCALES[st.scale] };
  }

  function deg(gr, d, oct) { const s = gr.scale; return gr.key + s[((d % s.length) + s.length) % s.length] + 12 * (Math.floor(d / s.length) + (oct || 0)); }
  function triad(gr, d, oct) { return [deg(gr, d, oct), deg(gr, d + 2, oct), deg(gr, d + 4, oct)]; }

  let walkPos = 0;
  function playStep(gr, n, t) {
    const st = gr.st, out = musicBus, s16 = 60 / gr.bpm / 4, i = n % 16, bar = Math.floor(n / 16);
    const d = gr.prog[bar % gr.prog.length];
    const sw = (i % 2) ? s16 * st.swing : 0; t += sw;
    if (st.k[i] === 'x') kick(t, st.chords === 'chug' ? 0.55 : gr.rec.genre === 'jazz' ? 0.35 : 0.9, out);
    if (st.s[i] === 'x') snare(t, gr.rec.genre === 'reggae' ? 0.35 : gr.rec.genre === 'folk' ? 0.18 : 0.45, out, gr.rec.genre === 'reggae' ? 900 : 1850);
    if (st.h === 'ride') { if (i % 4 === 0 || i % 4 === 3 && i % 8 === 7) ride(t, 0.13, out); if (i === 4 || i === 12) hat(t, 0.1, out); }
    else if (st.h[i] === 'x') hat(t, gr.rec.genre === 'folk' ? 0.05 : 0.1, out, st.openHat && i % 4 === 2);
    // bass
    const root = deg(gr, d, 0) - 12;
    switch (st.bass) {
      case '8th': if (i % 2 === 0) tone(t, root, s16 * 1.6, 0.45, out, 'sawtooth', 520); break;
      case '16th': tone(t, root, s16 * 0.8, 0.35, out, 'sawtooth', 440); break;
      case 'soul': if (i === 0 || i === 6 || i === 10 || i === 14) tone(t, i === 6 ? root + 7 : i === 14 ? root + 5 : root, s16 * 2.5, 0.52, out, 'triangle', 820); break;
      case 'walk': if (i % 4 === 0) { walkPos = i === 0 ? 0 : walkPos + (Math.random() < 0.7 ? 1 : -1); tone(t, deg(gr, d + walkPos, -1), s16 * 3.5, 0.56, out, 'triangle', 740); } break;
      case 'boom': if (i === 0 || i === 7 || i === 10) tone(t, root, s16 * 3, 0.62, out, 'sine', 420); break;
      case 'reggae': if ([0, 3, 6, 8, 11].includes(i)) tone(t, i === 6 ? root + 7 : i === 11 ? root + 5 : root, s16 * 2.4, 0.66, out, 'sine', 400); break;
      case 'house': if (i % 4 === 2) tone(t, root, s16 * 1.5, 0.55, out, 'sawtooth', 640); break;
      case 'octave': if (i % 2 === 0) tone(t, root + (i % 4 ? 12 : 0), s16 * 1.2, 0.5, out, 'sawtooth', 920); break;
      case 'root': if (i === 0 || i === 8) tone(t, i === 8 ? root + 7 : root, s16 * 6, 0.44, out, 'triangle', 640); break;
    }
    // harmony
    const tri = triad(gr, d, 1);
    switch (st.chords) {
      case 'power8': if (i % 2 === 0) power(t, deg(gr, d, 0), s16 * 1.7, 0.5, out); break;
      case 'chug': if (i % 2 === 0) power(t, deg(gr, 0, 0) - (i % 8 === 6 ? 1 : 0), s16 * 0.9, 0.5, out); break;
      case 'organ': if (i === 0 || i === 8) chord(t, tri.concat(deg(gr, d + 6, 1)), s16 * 7, 0.3, out, 'triangle', 1400, 0.04, 0.25); break;
      case 'comp': if (i === 3 || i === 10) chord(t, tri.concat(deg(gr, d + 6, 1)), s16 * 1.8, 0.3, out, 'rhodes', 2000, 0.01, 0.3); break;
      case 'rhodes': if (i === 0 || i === 6 || i === 12) chord(t, tri.concat(deg(gr, d + 6, 1)), s16 * 4.5, 0.3, out, 'rhodes', 1800, 0.01, 0.4); break;
      case 'skank': if (i % 8 === 4) chord(t, tri, s16 * 0.65, 0.36, out, 'square', 1850); break;
      case 'stab': if (i === 2 || i === 7 || i === 10) chord(t, tri, s16 * 0.95, 0.36, out, 'sawtooth', 2800); break;
      case 'strings': if (i === 0) chord(t, tri.concat(tri[0] + 12), s16 * 15, 0.24, out, 'sawtooth', 2500, 0.22, 0.35); break;
      case 'arp': if (i % 2 === 0) pluck(t, tri[(i / 2) % 3] + ((i / 2) % 6 > 2 ? 12 : 0), 0.34, out); break;
    }
    // lead melody
    const note = gr.tune[n % 32];
    if (note != null) {
      const lType = gr.rec.genre === 'jazz' || gr.rec.genre === 'soul' ? 'triangle' : gr.rec.genre === 'folk' ? 'sine' : 'square';
      tone(t, gr.key + 24 + note, s16 * 1.9, 0.17, out, lType, 2600, 0.008, 0.12, 3);
    }
    if (onBeat && i % 4 === 0) { const dl = Math.max(0, (t - ctx.currentTime) * 1000); setTimeout(() => onBeat && onBeat(i === 0 ? 1 : 0.6), dl); }
  }

  function tick() {
    if (!cur || !ctx) return;
    const s16 = 60 / cur.bpm / 4;
    while (nextT < ctx.currentTime + 0.12) { playStep(cur, stepN, nextT); nextT += s16; stepN++; }
  }

  function play(rec) {
    if (!init()) return;
    if (cur && rec && cur.rec.id === rec.id) return;
    stop();
    if (!rec) return;
    cur = makeGroove(rec); stepN = 0; walkPos = 0; nextT = ctx.currentTime + 0.12;
    lp.frequency.setValueAtTime(cur.st.dusty ? 3400 : 9500, ctx.currentTime);
    timer = setInterval(tick, 25);
    scratch(0.22);
    startCrackle();
  }
  function stop() { if (timer) clearInterval(timer); timer = null; cur = null; }
  const playing = () => cur && cur.rec;

  function startCrackle() {
    if (crackleSrc || !ctx) return;
    const len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() < 0.0008 ? (Math.random() * 2 - 1) * 0.65 : (Math.random() * 2 - 1) * 0.01;
    crackleSrc = ctx.createBufferSource(); crackleSrc.buffer = b; crackleSrc.loop = true;
    const g = ctx.createGain(); g.gain.value = 0.2; crackleSrc.connect(g); g.connect(musicBus); crackleSrc.start();
  }

  // ---------- expressive character voice synthesis ----------
  // Dual-formant (F1/F2) vowel tract synthesiser with character pitch profiles, vibrato and emotional inflection.
  const VOWELS = {
    a: [780, 1250], e: [520, 1850], i: [310, 2250], o: [480, 920], u: [340, 780]
  };
  const VOICE_PROFILES = {
    chungy:  { pitch: 128, speed: 0.068, wave: 'sawtooth', vib: 4 },
    beryl:   { pitch: 235, speed: 0.078, wave: 'triangle', vib: 12 },
    kwesi:   { pitch: 112, speed: 0.060, wave: 'sawtooth', vib: 2 },
    gemma:   { pitch: 192, speed: 0.076, wave: 'sawtooth', vib: 1 },
    terry:   { pitch: 86,  speed: 0.075, wave: 'sawtooth', vib: 3 },
    okafor:  { pitch: 118, speed: 0.076, wave: 'triangle', vib: 6 },
    pip:     { pitch: 310, speed: 0.056, wave: 'triangle', vib: 5 },
    rosa:    { pitch: 228, speed: 0.062, wave: 'sawtooth', vib: 9 },
    grimsby: { pitch: 94,  speed: 0.082, wave: 'sawtooth', vib: 2 },
  };

  function profileFor(who, seed, mood) {
    if (who && VOICE_PROFILES[who]) return VOICE_PROFILES[who];
    const s = Math.abs(seed || 1);
    const fem = (s % 2) === 0;
    return {
      pitch: (fem ? 210 : 122) + (s % 35) - 15 + (mood === 'joy' || mood === 'wow' ? 18 : mood === 'cross' ? -10 : 0),
      speed: 0.064 + (s % 15) * 0.001,
      wave: fem && (s % 3 === 0) ? 'triangle' : 'sawtooth',
      vib: 3 + (s % 6),
    };
  }

  function synthSyllable(t, f0, f1End, vow, dur, wave, vib, vol) {
    const o = ctx.createOscillator(), sub = ctx.createOscillator();
    const fm1 = ctx.createBiquadFilter(), fm2 = ctx.createBiquadFilter();
    const g = ctx.createGain(), sg = ctx.createGain();
    o.type = wave || 'sawtooth';
    sub.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.linearRampToValueAtTime(f1End, t + dur);
    sub.frequency.setValueAtTime(f0 * 0.5, t);
    sub.frequency.linearRampToValueAtTime(f1End * 0.5, t + dur);
    if (vib) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 5.5; lg.gain.value = vib;
      lfo.connect(lg); lg.connect(o.frequency);
      lfo.start(t); lfo.stop(t + dur + 0.03);
    }
    const [F1, F2] = VOWELS[vow] || VOWELS.a;
    const scale = Math.max(0.85, Math.min(1.35, f0 / 150));
    fm1.type = 'bandpass'; fm1.frequency.setValueAtTime(F1 * scale, t); fm1.Q.value = 4.2;
    fm2.type = 'bandpass'; fm2.frequency.setValueAtTime(F2 * scale, t); fm2.Q.value = 5.5;
    sg.gain.value = 0.28;
    env(g, t, 0.01, vol, dur * 0.65, 0.45, 0.025, dur * 0.85);
    o.connect(fm1); o.connect(fm2);
    sub.connect(sg); sg.connect(g);
    fm1.connect(g); fm2.connect(g);
    g.connect(voiceBus);
    o.start(t); o.stop(t + dur + 0.04);
    sub.start(t); sub.stop(t + dur + 0.04);
  }

  function speak(text, opts) {
    if (!init() || muted || !text) return;
    opts = opts || {};
    if (voiceTimer) { clearTimeout(voiceTimer); voiceTimer = null; }
    const clean = String(text).replace(/<[^>]*>/g, '').replace(/[^\w\s?!.,']/g, '').trim();
    if (!clean) return;
    const prof = profileFor(opts.who, opts.seed, opts.mood);
    const question = /\?\s*$/.test(clean), exclaim = /!\s*$/.test(clean);
    // Extract syllable-like chunks from words (capped so long paragraphs stay snappy and pleasant)
    const words = clean.split(/\s+/).slice(0, 12);
    const syls = [];
    for (const w of words) {
      const m = w.toLowerCase().match(/[aeiouy]+/g) || ['a'];
      for (let i = 0; i < Math.min(2, m.length); i++) {
        const ch = m[i][0] === 'y' ? 'i' : m[i][0];
        syls.push({ v: VOWELS[ch] ? ch : 'a', stress: i === 0, endWord: i === Math.min(2, m.length) - 1 });
      }
      if (syls.length >= 14) break;
    }
    let t = ctx.currentTime + 0.02;
    const n = syls.length;
    for (let i = 0; i < n; i++) {
      const s = syls[i], u = i / Math.max(1, n - 1);
      const dur = prof.speed * (s.stress ? 1.12 : 0.86);
      let contour = 1 + Math.sin(u * Math.PI) * 0.08 + ((i * 7 + (opts.seed || 3)) % 5 - 2) * 0.03;
      if (question && i >= n - 2) contour *= 1.12 + (i - (n - 2)) * 0.14;
      else if (exclaim && i === 0) contour *= 1.15;
      else if (!question && i === n - 1) contour *= 0.9;
      if (opts.mood === 'sad' || opts.mood === 'meh') contour *= (1 - u * 0.12);
      const f0 = prof.pitch * contour;
      const f1 = f0 * (question && i === n - 1 ? 1.16 : s.stress ? 1.05 : 0.96);
      synthSyllable(t, f0, f1, s.v, dur, prof.wave, prof.vib, 0.16);
      t += dur + (s.endWord ? 0.024 : 0.008);
    }
  }

  // ---------- sound effects ----------
  function blip(f, t, len, v, type, f2) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + len); env(g, t, 0.003, v, len, 0.001); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + len + 0.05); }
  function scratch(v) { if (!init()) return; const t = ctx.currentTime, n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.Q.value = 4; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.12); f.frequency.exponentialRampToValueAtTime(300, t + 0.25); env(g, t, 0.01, v || 0.5, 0.25, 0.001); n.connect(f); f.connect(g); g.connect(sfxBus); n.start(t); n.stop(t + 0.3); }
  const SFX = {
    till() { const t = ctx.currentTime; blip(2093, t, 0.12, 0.25, 'triangle'); blip(2637, t + 0.08, 0.38, 0.25, 'triangle'); blip(3136, t + 0.08, 0.35, 0.12, 'sine'); const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 4200; env(g, t + 0.05, 0.002, 0.2, 0.2, 0.001); n.connect(f); f.connect(g); g.connect(sfxBus); n.start(t + 0.05); n.stop(t + 0.3); },
    bell() { const t = ctx.currentTime; for (let i = 0; i < 2; i++) { blip(1568, t + i * 0.13, 0.55, 0.14); blip(2350, t + i * 0.13, 0.45, 0.07); } },
    pop() { blip(580, ctx.currentTime, 0.12, 0.28, 'sine', 1380); },
    heart() { const t = ctx.currentTime; [523, 659, 784, 1046].forEach((f, i) => { blip(f, t + i * 0.07, 0.28, 0.18, 'triangle'); blip(f * 1.5, t + i * 0.07, 0.22, 0.06, 'sine'); }); },
    fail() { scratch(0.55); blip(220, ctx.currentTime + 0.05, 0.4, 0.2, 'sawtooth', 110); },
    flip() { const t = ctx.currentTime, n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 1800; env(g, t, 0.002, 0.25, 0.06, 0.001); n.connect(f); f.connect(g); g.connect(sfxBus); n.start(t); n.stop(t + 0.1); blip(420, t, 0.05, 0.08, 'triangle', 680); },
    rare() { const t = ctx.currentTime; [659, 784, 988, 1318].forEach((f, i) => { blip(f, t + i * 0.06, 0.4, 0.18, 'triangle'); blip(f * 0.5, t + i * 0.06, 0.35, 0.1, 'sine'); }); },
    legend() { const t = ctx.currentTime; [523, 659, 784, 1046, 784, 1046, 1318, 1568].forEach((f, i) => { blip(f, t + i * 0.09, 0.5, 0.18, 'triangle'); blip(f / 2, t + i * 0.09, 0.5, 0.14, 'sine'); }); },
    combo(n) { const t = ctx.currentTime; blip(440 * Math.pow(2, Math.min(n, 12) / 12), t, 0.15, 0.2, 'triangle'); blip(880 * Math.pow(2, Math.min(n, 12) / 12), t + 0.07, 0.22, 0.16, 'sine'); },
    alarm() { const t = ctx.currentTime; for (let i = 0; i < 3; i++) blip(880, t + i * 0.18, 0.12, 0.2, 'square', 660); },
    level() { const t = ctx.currentTime; [392, 523, 659, 784, 1046].forEach((f, i) => blip(f, t + i * 0.1, 0.5, 0.22, 'triangle')); },
    click() { blip(1100, ctx.currentTime, 0.035, 0.11, 'triangle'); },
    meow() {
      const t = ctx.currentTime;
      synthSyllable(t, 520, 740, 'i', 0.14, 'triangle', 8, 0.2);
      synthSyllable(t + 0.12, 740, 460, 'a', 0.24, 'triangle', 10, 0.22);
    },
    cash() { const t = ctx.currentTime; for (let i = 0; i < 4; i++) blip(1800 + Math.random() * 800, t + i * 0.05, 0.08, 0.12, 'triangle'); },
  };
  function sfx(name, arg) { if (!init() || muted) return; try { SFX[name] && SFX[name](arg); } catch (e) { /* audio is best-effort */ } }

  function setVolumes(m, s) { musicVol = m; sfxVol = s; if (musicBus) musicBus.gain.value = m * 0.58; if (sfxBus) sfxBus.gain.value = s; }
  function setMuted(v) { muted = v; if (master) master.gain.value = v ? 0 : 1; }
  function duck(on) { if (lp && ctx) lp.frequency.setTargetAtTime(on ? 950 : (cur && cur.st.dusty ? 3400 : 9500), ctx.currentTime, 0.2); }

  G.CRS_AUDIO = { init, play, stop, playing, sfx, speak, setVolumes, setMuted, duck, set onBeat(f) { onBeat = f; }, get muted() { return muted; } };
})(typeof window !== 'undefined' ? window : globalThis);

