// Chungy's Record Shop: everything is drawn in code (no image files), so it's all original and scales to any screen.
(function (G) {
  'use strict';
  const D = G.CRS_DATA;
  const TAU = Math.PI * 2;

  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  }
  const OUT = '#2a1a24';  // outline colour for the chunky cartoon look

  // ---------- people ----------
  // look: { skin, hair, hairCol, top, col, legs, acc, build, h }
  // o: { walk (phase or null), face, blink, arm: 'idle'|'wave'|'hold'|'cheer'|'cross'|'point', holdCol, flip, t }
  function person(c, L, x, foot, sc, o) {
    o = o || {};
    const h = (L.h || 1), b = (L.build || 1);
    c.save(); c.translate(x, foot); c.scale(sc * (o.flip ? -1 : 1), sc);
    const t = o.t || 0;
    const step = o.walk != null ? Math.sin(o.walk) : 0;
    const bob = o.walk != null ? Math.abs(Math.cos(o.walk)) * 4 : Math.sin(t * 2 + (L.seed || 0)) * 1.2;
    c.lineWidth = 3.2; c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = OUT;
    const legH = 62 * h, torsoH = 82 * h, bw = 30 * b;
    const hipY = -legH - bob, shY = hipY - torsoH, headY = shY - 34;
    // shadow
    c.fillStyle = 'rgba(30,10,20,.22)'; c.beginPath(); c.ellipse(0, 2, bw * 1.4, 8, 0, 0, TAU); c.fill();
    // long hair behind
    hairBack(c, L, headY);
    // legs
    const legCol = L.legs || '#2b3a67';
    for (const sgn of [-1, 1]) {
      const lift = o.walk != null ? Math.max(0, sgn * step) * 10 : 0, sw = o.walk != null ? sgn * step * 8 : 0;
      c.fillStyle = legCol; rr(c, sgn * bw * 0.45 - 10 + sw, hipY - 4, 20, legH - lift + 2 + bob, 8); c.fill(); c.stroke();
      c.fillStyle = '#231a1a'; rr(c, sgn * bw * 0.45 - 13 + sw + sgn * 3, -12 - lift, 26, 13, 6); c.fill(); c.stroke();
    }
    // arms behind body (when idle they hang at the sides)
    const arm = o.arm || 'idle';
    const sleeve = topColour(L);
    const handCol = L.skin;
    function limb(sx, sy, ex, ey) {
      c.strokeStyle = OUT; c.lineWidth = 17; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
      c.strokeStyle = sleeve; c.lineWidth = 11; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
      c.fillStyle = handCol; c.lineWidth = 3; c.strokeStyle = OUT; c.beginPath(); c.arc(ex, ey, 7.5, 0, TAU); c.fill(); c.stroke();
    }
    const swing = o.walk != null ? step * 10 : Math.sin(t * 1.6 + (L.seed || 0)) * 2;
    const ax = bw + 2, ay = shY + 12;
    const arms = {
      idle: [[-ax, ay, -ax - 8 - swing * 0.3, hipY + 6 + swing], [ax, ay, ax + 8 + swing * 0.3, hipY + 6 - swing]],
      wave: [[-ax, ay, -ax - 8, hipY + 6], [ax, ay, ax + 26, ay - 40 + Math.sin(t * 12) * 8]],
      cheer: [[-ax, ay, -ax - 22, ay - 52 + Math.sin(t * 14) * 5], [ax, ay, ax + 22, ay - 52 - Math.sin(t * 14) * 5]],
      hold: [[-ax, ay, -10, ay + 30], [ax, ay, 10, ay + 30]],
      cross: [[-ax, ay, bw * 0.6, ay + 26], [ax, ay, -bw * 0.6, ay + 30]],
      point: [[-ax, ay, -ax - 8, hipY + 6], [ax, ay, ax + 40, ay + 4]],
      think: [[-ax, ay, -ax - 8, hipY + 6], [ax, ay, 14, headY + 30]],
    }[arm];
    // torso
    torso(c, L, bw, shY, hipY, torsoH);
    if (arm !== 'cross' && arm !== 'hold') arms.forEach(a => limb(...a));
    // neck + head
    c.fillStyle = L.skin; rr(c, -9, shY - 12, 18, 16, 5); c.fill();
    head(c, L, headY, o);
    if (arm === 'cross' || arm === 'hold') arms.forEach(a => limb(...a));
    if (arm === 'hold' && o.holdCol) { // a record sleeve held to the chest
      c.save(); c.translate(0, ay + 10); c.rotate(-0.08); c.fillStyle = o.holdCol; c.lineWidth = 3; rr(c, -26, -26, 52, 52, 3); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(0, 0, 12, 0, TAU); c.fill(); c.restore();
    }
    c.restore();
  }

  function topColour(L) { return L.top === 'leather' ? '#1d1a1f' : L.top === 'denim' ? '#4d6fa8' : L.col; }

  function torso(c, L, bw, shY, hipY, th) {
    const col = topColour(L);
    c.fillStyle = col; c.strokeStyle = OUT; c.lineWidth = 3.2;
    rr(c, -bw, shY, bw * 2, th + 6, Math.min(26, bw)); c.fill(); c.stroke();
    const mid = shY + th / 2;
    c.lineWidth = 2.4;
    switch (L.top) {
      case 'hoodie':
        c.fillStyle = shade(col, -0.18); rr(c, -bw * 0.55, mid + 6, bw * 1.1, th * 0.28, 8); c.fill(); c.stroke();
        c.strokeStyle = '#eee'; c.beginPath(); c.moveTo(-6, shY + 4); c.lineTo(-7, shY + 26); c.moveTo(6, shY + 4); c.lineTo(7, shY + 26); c.stroke(); break;
      case 'leather':
        c.strokeStyle = '#8a8a96'; c.beginPath(); c.moveTo(4, shY + 2); c.lineTo(-2, hipY); c.stroke();
        c.fillStyle = '#2d2a31'; c.beginPath(); c.moveTo(-bw + 4, shY + 4); c.lineTo(-4, shY + 30); c.lineTo(-10, shY + 2); c.fill();
        c.beginPath(); c.moveTo(bw - 4, shY + 4); c.lineTo(8, shY + 30); c.lineTo(12, shY + 2); c.fill();
        c.fillStyle = '#c7c7d0'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-bw + 9, shY + 14 + i * 12, 2, 0, TAU); c.fill(); } break;
      case 'denim':
        c.strokeStyle = '#e9c46a'; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(0, shY + 4); c.lineTo(0, hipY); c.moveTo(-bw + 6, shY + 26); c.lineTo(bw - 6, shY + 26); c.stroke(); c.setLineDash([]); break;
      case 'cardigan':
        c.fillStyle = '#f4efe1'; c.beginPath(); c.moveTo(-12, shY + 1); c.lineTo(0, shY + 40); c.lineTo(12, shY + 1); c.fill();
        c.fillStyle = shade(col, -0.35); for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, shY + 48 + i * 13, 3, 0, TAU); c.fill(); } break;
      case 'suit':
        c.fillStyle = '#f4f4f4'; c.beginPath(); c.moveTo(-13, shY + 1); c.lineTo(0, shY + 44); c.lineTo(13, shY + 1); c.fill();
        c.fillStyle = '#c3001b'; c.beginPath(); c.moveTo(-3, shY + 6); c.lineTo(3, shY + 6); c.lineTo(5, shY + 38); c.lineTo(0, shY + 44); c.lineTo(-5, shY + 38); c.fill(); break;
      case 'turtleneck':
        c.fillStyle = shade(col, -0.15); rr(c, -14, shY - 10, 28, 16, 6); c.fill(); c.stroke(); break;
      case 'sequin':
        for (let i = 0; i < 26; i++) { const px = -bw + 6 + ((i * 37) % (bw * 2 - 12)), py = shY + 6 + ((i * 53) % (th - 6)); c.fillStyle = i % 2 ? '#fff' : shade(col, 0.5); c.beginPath(); c.arc(px, py, 1.8, 0, TAU); c.fill(); } break;
      case 'shirt':
        c.fillStyle = shade(col, 0.4); c.beginPath(); c.moveTo(-12, shY); c.lineTo(-2, shY + 14); c.lineTo(-14, shY + 12); c.fill(); c.beginPath(); c.moveTo(12, shY); c.lineTo(2, shY + 14); c.lineTo(14, shY + 12); c.fill();
        c.fillStyle = shade(col, -0.4); for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(0, shY + 22 + i * 14, 2.2, 0, TAU); c.fill(); } break;
      default: // tee with a little print
        c.fillStyle = shade(col, col === '#111' || col === '#222' ? 0.5 : 0.45); c.beginPath(); c.arc(0, mid - 4, 11, 0, TAU); c.fill();
        c.fillStyle = col; c.beginPath(); c.arc(0, mid - 4, 4, 0, TAU); c.fill();
    }
    if (L.acc === 'chain') { c.strokeStyle = '#ffd34d'; c.lineWidth = 3; c.beginPath(); c.arc(0, shY + 4, 16, 0.25 * Math.PI, 0.75 * Math.PI); c.stroke(); }
  }

  function hairBack(c, L, hy) {
    const hc = L.hairCol; c.fillStyle = hc; c.strokeStyle = OUT; c.lineWidth = 3.2;
    if (L.hair === 'long') { rr(c, -40, hy - 22, 80, 96, 30); c.fill(); c.stroke(); }
    else if (L.hair === 'locs') { for (let i = -4; i <= 4; i++) { rr(c, i * 9 - 5, hy - 6, 11, 80 - Math.abs(i) * 4, 5); c.fill(); c.stroke(); } }
    else if (L.hair === 'braids') { for (const s of [-1, 1]) { rr(c, s * 34 - 6, hy - 6, 12, 64, 6); c.fill(); c.stroke(); } }
    else if (L.hair === 'afro') { c.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; c.moveTo(Math.cos(a) * 44, hy - 8 + Math.sin(a) * 40); c.arc(Math.cos(a) * 44, hy - 8 + Math.sin(a) * 40, 14, 0, TAU); } c.fill(); c.beginPath(); c.arc(0, hy - 8, 48, 0, TAU); c.fill(); c.stroke(); }
    else if (L.hair === 'curly') { c.beginPath(); for (let i = 0; i < 11; i++) { const a = Math.PI + i / 10 * Math.PI; c.moveTo(Math.cos(a) * 36, hy - 4 + Math.sin(a) * 32); c.arc(Math.cos(a) * 36, hy - 4 + Math.sin(a) * 32, 11, 0, TAU); } c.fill(); }
    else if (L.hair === 'bob') { rr(c, -40, hy - 30, 80, 66, 26); c.fill(); c.stroke(); }
    else if (L.hair === 'hood') { c.fillStyle = shade(L.col, -0.1); c.beginPath(); c.arc(0, hy - 2, 44, 0, TAU); c.fill(); c.stroke(); }
  }

  function head(c, L, hy, o) {
    const R = 34;
    c.fillStyle = L.skin; c.strokeStyle = OUT; c.lineWidth = 3.2;
    // ears
    for (const s of [-1, 1]) { c.beginPath(); c.arc(s * R, hy + 4, 8, 0, TAU); c.fill(); c.stroke(); }
    c.beginPath(); c.arc(0, hy, R, 0, TAU); c.fill(); c.stroke();
    if (L.acc === 'beard') { c.fillStyle = L.hairCol; c.beginPath(); c.arc(0, hy + 6, R - 1, 0.1 * Math.PI, 0.9 * Math.PI); c.quadraticCurveTo(0, hy + R + 22, R * Math.cos(0.1 * Math.PI), hy + 6 + R * Math.sin(0.1 * Math.PI)); c.fill(); c.stroke(); }
    if (L.acc === 'earrings') { c.fillStyle = '#ffd34d'; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * (R + 2), hy + 15, 4, 0, TAU); c.fill(); } }
    face(c, L, hy, o);
    hairFront(c, L, hy, R);
    // accessories on the face/head
    c.lineWidth = 3; c.strokeStyle = OUT;
    if (L.acc === 'glasses') { c.strokeStyle = '#2a1a24'; c.lineWidth = 2.6; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 13, hy, 10, 0, TAU); c.stroke(); } c.beginPath(); c.moveTo(-3, hy); c.lineTo(3, hy); c.stroke(); }
    if (L.acc === 'shades') { c.fillStyle = '#16121a'; for (const s of [-1, 1]) { rr(c, s * 13 - 12, hy - 8, 24, 15, 6); c.fill(); } c.fillRect(-4, hy - 4, 8, 3); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-20, hy - 5, 6, 2); c.fillRect(6, hy - 5, 6, 2); }
    if (L.acc === 'piercing') { c.fillStyle = '#c7c7d0'; c.beginPath(); c.arc(9, hy + 9, 2.5, 0, TAU); c.fill(); c.beginPath(); c.arc(-R - 2, hy + 8, 3, 0, TAU); c.fill(); }
    if (L.acc === 'headphones') { c.strokeStyle = '#222'; c.lineWidth = 5; c.beginPath(); c.arc(0, hy + 30, 26, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); c.fillStyle = '#e23b3b'; for (const s of [-1, 1]) { rr(c, s * 24 - 7, hy + 38, 14, 16, 5); c.fill(); } }
  }

  function face(c, L, hy, o) {
    const f = o.face || 'neutral';
    const blink = o.blink;
    const ey = hy - 2;
    // eyes
    for (const s of [-1, 1]) {
      const ex = s * 12;
      if (f === 'joy') { c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.arc(ex, ey + 3, 6, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); continue; }
      if (blink) { c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(ex - 5, ey); c.lineTo(ex + 5, ey); c.stroke(); continue; }
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, ey, 7, f === 'wow' ? 9 : 8, 0, 0, TAU); c.fill();
      c.fillStyle = '#20141c'; c.beginPath(); c.arc(ex + (o.look || 0) * 2, ey + 1, f === 'wow' ? 3 : 4, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + 1.5, ey - 1.5, 1.3, 0, TAU); c.fill();
    }
    // brows
    c.strokeStyle = shade(L.hairCol || '#3b2414', -0.2); c.lineWidth = 3.4;
    const tilt = f === 'cross' ? 5 : f === 'meh' ? -2 : f === 'wow' ? -4 : 0;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 18, ey - 13 - (f === 'wow' ? 4 : 0) - (s > 0 ? 0 : 0)); c.lineTo(s * 6, ey - 13 + tilt); c.stroke(); }
    // cheeks
    if (f === 'joy' || f === 'happy') { c.fillStyle = 'rgba(255,90,110,.35)'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 20, hy + 10, 7, 4, 0, 0, TAU); c.fill(); } }
    // nose
    c.strokeStyle = shade(L.skin, -0.3); c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, hy + 2); c.quadraticCurveTo(4, hy + 8, -1, hy + 10); c.stroke();
    // mouth
    c.strokeStyle = OUT; c.lineWidth = 3; c.fillStyle = '#7a1f2e';
    const my = hy + 18;
    if (f === 'joy') { c.beginPath(); c.arc(0, my - 3, 11, 0.05 * Math.PI, 0.95 * Math.PI); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.fillRect(-7, my - 3, 14, 3); }
    else if (f === 'happy') { c.beginPath(); c.arc(0, my - 6, 9, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
    else if (f === 'wow') { c.beginPath(); c.ellipse(0, my, 5, 7, 0, 0, TAU); c.fill(); c.stroke(); }
    else if (f === 'cross') { c.beginPath(); c.arc(0, my + 6, 9, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke(); }
    else if (f === 'meh') { c.beginPath(); c.moveTo(-7, my); c.lineTo(7, my - 2); c.stroke(); }
    else if (f === 'talk') { c.beginPath(); c.ellipse(0, my - 1, 7, 3 + Math.abs(Math.sin((o.t || 0) * 18)) * 4, 0, 0, TAU); c.fill(); c.stroke(); }
    else { c.beginPath(); c.arc(0, my - 4, 6, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); }
  }

  function hairFront(c, L, hy, R) {
    const hc = L.hairCol; c.fillStyle = hc; c.strokeStyle = OUT; c.lineWidth = 3.2;
    switch (L.hair) {
      case 'short': case 'braids': c.beginPath(); c.arc(0, hy - 4, R + 1, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(10, hy - 22, -R, hy - 6); c.fill(); c.stroke(); break;
      case 'quiff': c.beginPath(); c.arc(0, hy - 4, R + 1, Math.PI * 1.05, Math.PI * 1.95); c.quadraticCurveTo(26, hy - 60, -20, hy - 52); c.quadraticCurveTo(-34, hy - 40, -R, hy - 8); c.fill(); c.stroke(); break;
      case 'shaggy': case 'long': c.beginPath(); c.arc(0, hy - 2, R + 3, Math.PI * 1.0, Math.PI * 2.0); for (let i = 0; i < 6; i++) c.lineTo(R - i * 13, hy - 12 + (i % 2) * 10); c.closePath(); c.fill(); c.stroke(); break;
      case 'mohawk': for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(-7, hy - R + 6 + Math.abs(i) * 2 - i * 0); c.lineTo(i * 4, hy - R - 34 + Math.abs(i) * 5); c.lineTo(7, hy - R + 6); c.closePath(); c.fill(); c.stroke(); } break;
      case 'spiky': c.beginPath(); c.moveTo(-R, hy - 6); for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI; c.lineTo(Math.cos(a) * (R + (i % 2 ? 16 : 2)), hy - 4 + Math.sin(a) * (R + (i % 2 ? 16 : 2))); } c.closePath(); c.fill(); c.stroke(); break;
      case 'bob': c.beginPath(); c.arc(0, hy - 4, R + 2, Math.PI * 1.0, Math.PI * 2.0); c.lineTo(R + 2, hy - 8); c.lineTo(-R - 2, hy - 8); c.fill(); c.fillRect(-R - 2, hy - 14, 2 * R + 4, 10); break;
      case 'bun': c.beginPath(); c.arc(0, hy - R - 8, 15, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.arc(0, hy - 4, R + 1, Math.PI * 1.05, Math.PI * 1.95); c.quadraticCurveTo(0, hy - 18, -R, hy - 8); c.fill(); c.stroke(); break;
      case 'afro': case 'curly': c.beginPath(); c.arc(0, hy - 6, R + 4, Math.PI * 1.05, Math.PI * 1.95); c.quadraticCurveTo(0, hy - 16, -R, hy - 10); c.fill(); break;
      case 'locs': c.beginPath(); c.arc(0, hy - 4, R + 2, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(0, hy - 14, -R, hy - 6); c.fill(); c.stroke(); break;
      case 'cap': c.fillStyle = shade(L.col, -0.05); c.beginPath(); c.arc(0, hy - 6, R + 2, Math.PI, TAU); c.closePath(); c.fill(); c.stroke(); rr(c, -R - 2, hy - 12, 2 * R + 30, 10, 5); c.fill(); c.stroke(); break;
      case 'beret': c.fillStyle = '#1b1b24'; c.beginPath(); c.ellipse(-6, hy - R + 2, R + 6, 14, -0.15, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.arc(-4, hy - R - 12, 3, 0, TAU); c.fill(); break;
      case 'tam': { const cols = ['#d12d2d', '#ffd000', '#2fb35a']; for (let i = 0; i < 3; i++) { c.fillStyle = cols[i]; c.beginPath(); c.ellipse(0, hy - R - 2 - i * 9, R + 8 - i * 4, 11, 0, 0, TAU); c.fill(); c.stroke(); } break; }
      case 'buckethat': c.fillStyle = L.col; c.beginPath(); c.ellipse(0, hy - 14, R + 14, 9, 0, 0, TAU); c.fill(); c.stroke(); rr(c, -R + 4, hy - R - 14, 2 * R - 8, 30, 12); c.fill(); c.stroke(); break;
      case 'beanie': c.fillStyle = shade(L.col, 0.1); c.beginPath(); c.arc(0, hy - 16, R + 2, Math.PI, TAU); c.closePath(); c.fill(); c.stroke(); rr(c, -R - 3, hy - 27, 2 * R + 6, 12, 5); c.fill(); c.stroke(); break;
      case 'hood': c.fillStyle = shade(L.col, -0.1); c.beginPath(); c.arc(0, hy - 2, R + 9, Math.PI * 0.95, Math.PI * 2.05); c.lineTo(R - 2, hy + 4); c.arc(0, hy, R - 4, 0, Math.PI, true); c.closePath(); c.fill(); c.stroke(); break;
      case 'bald': c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(-10, hy - 22, 9, 5, -0.4, 0, TAU); c.fill(); break;
    }
  }

  // ---------- Chungy himself ----------
  const CHUNGY = { skin: '#e9b98f', hair: 'beanie', hairCol: '#3b2414', top: 'tee', col: '#f2a93b', legs: '#2b3a67', acc: 'beard', build: 1.45, h: 1.02, seed: 3 };
  function chungy(c, x, foot, sc, o) {
    o = o || {};
    person(c, CHUNGY, x, foot, sc, o);
    // apron with a record logo, and headphones round his neck
    c.save(); c.translate(x, foot); c.scale(sc, sc);
    const b = Math.sin((o.t || 0) * 2 + 3) * 1.2;
    const hipY = -62 - b, shY = hipY - 84;
    c.fillStyle = '#2f6f5e'; c.strokeStyle = OUT; c.lineWidth = 3;
    rr(c, -30, shY + 22, 60, 84, 10); c.fill(); c.stroke();
    c.fillStyle = '#1a1a1a'; c.beginPath(); c.arc(0, shY + 58, 15, 0, TAU); c.fill();
    c.fillStyle = '#f2a93b'; c.beginPath(); c.arc(0, shY + 58, 5, 0, TAU); c.fill();
    c.strokeStyle = '#222'; c.lineWidth = 6; c.beginPath(); c.arc(0, shY - 6, 24, 0.12 * Math.PI, 0.88 * Math.PI); c.stroke();
    c.fillStyle = '#e23b3b'; for (const s of [-1, 1]) { rr(c, s * 22 - 8, shY + 2, 16, 18, 6); c.fill(); }
    // pom-pom on the beanie
    c.fillStyle = '#fff4d6'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.arc(0, shY - 34 - 54, 10, 0, TAU); c.fill(); c.stroke();
    c.restore();
  }

  // ---------- the shop cat ----------
  function cat(c, x, y, sc, t, flip, sleeping) {
    c.save(); c.translate(x, y); c.scale(sc * (flip ? -1 : 1), sc);
    c.fillStyle = '#3a3036'; c.strokeStyle = OUT; c.lineWidth = 3;
    c.fillStyle = 'rgba(30,10,20,.2)'; c.beginPath(); c.ellipse(0, 2, 34, 6, 0, 0, TAU); c.fill();
    c.fillStyle = '#ef9a3a';
    if (sleeping) { c.beginPath(); c.ellipse(0, -14, 30, 16, 0, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.arc(22, -20, 13, 0, TAU); c.fill(); c.stroke(); c.strokeStyle = OUT; c.beginPath(); c.moveTo(17, -20); c.lineTo(22, -19); c.moveTo(25, -19); c.lineTo(30, -20); c.stroke(); c.restore(); return; }
    const w = Math.sin(t * 8);
    c.beginPath(); c.moveTo(-26, -24); c.quadraticCurveTo(-48, -40 + w * 6, -40, -60 + w * 4); c.lineWidth = 7; c.strokeStyle = '#ef9a3a'; c.stroke(); c.lineWidth = 3; c.strokeStyle = OUT;
    c.beginPath(); c.ellipse(0, -24, 30, 16, 0, 0, TAU); c.fill(); c.stroke();
    for (const lx of [-18, -8, 10, 20]) { rr(c, lx - 4, -14 + (lx % 20 ? Math.max(0, w) * 3 : 0), 8, 16, 4); c.fill(); c.stroke(); }
    c.beginPath(); c.arc(26, -38, 15, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(16, -48); c.lineTo(18, -62); c.lineTo(26, -52); c.moveTo(30, -52); c.lineTo(38, -62); c.lineTo(38, -46); c.fill(); c.stroke();
    c.fillStyle = '#20141c'; c.beginPath(); c.arc(21, -39, 2.5, 0, TAU); c.arc(32, -39, 2.5, 0, TAU); c.fill();
    c.fillStyle = '#d0603a'; for (const sx of [-14, -2, 10]) { c.beginPath(); c.ellipse(sx, -34, 3, 8, 0.2, 0, TAU); c.fill(); }
    c.restore();
  }

  // ---------- record sleeves ----------
  const sleeveCache = new Map();
  function sleeveCanvas(rec, size) {
    size = size || 160;
    const key = rec.id + '@' + size;
    if (sleeveCache.has(key)) return sleeveCache.get(key);
    const cv = (typeof OffscreenCanvas !== 'undefined' && !G.document) ? new OffscreenCanvas(size, size) : G.document.createElement('canvas');
    cv.width = cv.height = size;
    const c = cv.getContext('2d');
    const r = D.rng(rec.seed || 1), g = D.GENRES[rec.genre];
    const S = size, A = g.col, B = g.alt;
    c.save();
    const style = rec.genre;
    const palette = [A, B, shade(A, -0.45), shade(B, 0.3), '#f4efe1', '#1b1820'];
    const P = () => palette[Math.floor(r() * palette.length)];
    // background
    const bg = style === 'metal' ? '#121016' : style === 'jazz' ? (r() < 0.5 ? '#f4efe1' : '#1f2b5c') : P();
    c.fillStyle = bg; c.fillRect(0, 0, S, S);
    switch (style) {
      case 'rock': { c.save(); c.translate(S / 2, S / 2); c.rotate(-0.5 + r()); for (let i = -6; i < 6; i++) { c.fillStyle = i % 2 ? A : B; c.fillRect(i * S * 0.12, -S, S * 0.06, S * 2); } c.restore(); c.fillStyle = shade(A, -0.4); c.beginPath(); c.arc(S * (0.3 + r() * 0.4), S * (0.3 + r() * 0.4), S * 0.22, 0, TAU); c.fill(); break; }
      case 'punk': { for (let i = 0; i < 7; i++) { c.save(); c.translate(r() * S, r() * S); c.rotate(r() - 0.5); c.fillStyle = P(); c.fillRect(-S * 0.25, -S * 0.12, S * 0.5, S * 0.24); c.restore(); } c.strokeStyle = '#111'; c.lineWidth = S * 0.03; c.beginPath(); for (let i = 0; i < 5; i++) c.lineTo(r() * S, r() * S); c.stroke(); break; }
      case 'metal': { c.fillStyle = B; c.beginPath(); c.moveTo(S * 0.5, S * 0.08); for (let i = 0; i < 10; i++) c.lineTo(S * (0.1 + r() * 0.8), S * (0.2 + i * 0.07)); c.lineTo(S * 0.5, S * 0.9); c.fill(); c.strokeStyle = A; c.lineWidth = 2; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(S / 2, S / 2); c.lineTo(S / 2 + Math.cos(i) * S, S / 2 + Math.sin(i * 1.7) * S); c.stroke(); } break; }
      case 'soul': { const gr = c.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, B); gr.addColorStop(1, A); c.fillStyle = gr; c.fillRect(0, 0, S, S); c.fillStyle = '#ffe9b0'; c.beginPath(); c.arc(S * 0.5, S * 0.58, S * 0.28, 0, TAU); c.fill(); c.fillStyle = shade(B, -0.5); c.beginPath(); c.arc(S * 0.5, S * 0.42, S * 0.11, 0, TAU); c.fill(); rr(c, S * 0.36, S * 0.52, S * 0.28, S * 0.5, S * 0.1); c.fill(); break; }
      case 'jazz': { for (let i = 0; i < 4; i++) { c.fillStyle = P(); c.fillRect(r() * S * 0.6, r() * S * 0.6, S * (0.15 + r() * 0.5), S * (0.08 + r() * 0.3)); } c.fillStyle = bg === '#f4efe1' ? '#1f2b5c' : '#f4efe1'; c.font = `900 ${S * 0.3}px Georgia, serif`; c.fillText(rec.artist.split(' ').pop().slice(0, 5).toUpperCase(), S * 0.06, S * 0.92); break; }
      case 'hiphop': { for (let i = 0; i < 8; i++) { c.fillStyle = P(); c.beginPath(); c.arc(r() * S, r() * S, S * (0.08 + r() * 0.2), 0, TAU); c.fill(); } c.fillStyle = '#1b1820'; rr(c, S * 0.2, S * 0.35, S * 0.6, S * 0.34, 8); c.fill(); c.fillStyle = A; for (const sx of [0.34, 0.66]) { c.beginPath(); c.arc(S * sx, S * 0.52, S * 0.1, 0, TAU); c.fill(); } break; }
      case 'reggae': { const cols = ['#d12d2d', '#ffd000', '#2fb35a']; for (let i = 0; i < 3; i++) { c.fillStyle = cols[i]; c.fillRect(0, i * S / 3, S, S / 3); } c.fillStyle = '#ffe9b0'; c.beginPath(); c.arc(S * 0.5, S * 0.5, S * 0.2, 0, TAU); c.fill(); c.strokeStyle = '#ffe9b0'; c.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.beginPath(); c.moveTo(S / 2 + Math.cos(a) * S * 0.25, S / 2 + Math.sin(a) * S * 0.25); c.lineTo(S / 2 + Math.cos(a) * S * 0.38, S / 2 + Math.sin(a) * S * 0.38); c.stroke(); } break; }
      case 'house': { for (let i = 9; i > 0; i--) { c.fillStyle = i % 2 ? A : B; c.beginPath(); c.arc(S * 0.5, S * 0.5, i * S * 0.07, 0, TAU); c.fill(); } c.fillStyle = '#111'; for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) if ((x + y) % 3 === 0) { c.beginPath(); c.arc((x + 0.5) * S / 8, (y + 0.5) * S / 8, 2, 0, TAU); c.fill(); } break; }
      case 'disco': { const gr = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.8); gr.addColorStop(0, B); gr.addColorStop(1, shade(B, -0.6)); c.fillStyle = gr; c.fillRect(0, 0, S, S); c.strokeStyle = A; c.lineWidth = 2; for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; c.beginPath(); c.moveTo(S / 2, S / 2); c.lineTo(S / 2 + Math.cos(a) * S, S / 2 + Math.sin(a) * S); c.stroke(); } c.fillStyle = '#d9dde6'; c.beginPath(); c.arc(S / 2, S * 0.45, S * 0.2, 0, TAU); c.fill(); c.fillStyle = '#9aa3b5'; for (let i = 0; i < 30; i++) { c.fillRect(S / 2 - S * 0.18 + (i % 6) * S * 0.06, S * 0.3 + Math.floor(i / 6) * S * 0.06, S * 0.05, S * 0.05); } break; }
      case 'folk': { c.fillStyle = '#e8dcc0'; c.fillRect(0, 0, S, S); c.fillStyle = shade(A, -0.3); c.beginPath(); c.moveTo(0, S * 0.75); for (let x = 0; x <= S; x += S / 6) c.lineTo(x, S * (0.6 + r() * 0.15)); c.lineTo(S, S); c.lineTo(0, S); c.fill(); c.fillStyle = '#5b3b1d'; c.fillRect(S * 0.47, S * 0.35, S * 0.06, S * 0.35); c.fillStyle = '#6b8f45'; c.beginPath(); c.arc(S * 0.5, S * 0.32, S * 0.18, 0, TAU); c.fill(); break; }
    }
    // title band
    c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, 0, S, S * 0.2);
    c.fillStyle = '#fff'; c.font = `700 ${Math.round(S * 0.075)}px Fredoka, "Trebuchet MS", sans-serif`; c.textBaseline = 'top';
    fitText(c, rec.artist.toUpperCase(), S * 0.05, S * 0.02, S * 0.9);
    c.font = `${Math.round(S * 0.065)}px Fredoka, "Trebuchet MS", sans-serif`; c.fillStyle = '#ffe9b0';
    fitText(c, rec.title, S * 0.05, S * 0.1, S * 0.9);
    // wear on cheaper records
    c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 1; c.beginPath(); c.arc(S / 2, S / 2, S * 0.36, 0, TAU); c.stroke();
    c.restore();
    sleeveCache.set(key, cv);
    return cv;
  }
  function fitText(c, s, x, y, w) { let t = s; while (c.measureText(t).width > w && t.length > 3) t = t.slice(0, -2); if (t !== s) t = t.slice(0, -1) + '…'; c.fillText(t, x, y); }

  function sleeveDataURL(rec, size) { const cv = sleeveCanvas(rec, size || 160); return cv.toDataURL ? cv.toDataURL() : ''; }

  // A spinning vinyl disc
  function vinyl(c, x, y, rad, ang, labelCol) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.fillStyle = '#121014'; c.beginPath(); c.arc(0, 0, rad, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = 1;
    for (let i = rad * 0.45; i < rad; i += 3) { c.beginPath(); c.arc(0, 0, i, 0, TAU); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, rad, -0.3, 0.1); c.fill();
    c.fillStyle = labelCol || '#f2a93b'; c.beginPath(); c.arc(0, 0, rad * 0.36, 0, TAU); c.fill();
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-rad * 0.2, -2, rad * 0.4, 4);
    c.fillStyle = '#ddd'; c.beginPath(); c.arc(0, 0, 2.5, 0, TAU); c.fill();
    c.restore();
  }

  // ---------- the shop ----------
  function shop(c, W, H, st) {
    // st: { t, clock (0..1 of day), up, wall:[rec], npRec, ang, rain, event, rating, open }
    const t = st.t;
    // back wall: warm painted plaster with a dado rail
    const wall = c.createLinearGradient(0, 0, 0, 430);
    wall.addColorStop(0, '#5a2e4f'); wall.addColorStop(1, '#7a3c5c');
    c.fillStyle = wall; c.fillRect(0, 0, W, 440);
    c.fillStyle = 'rgba(255,255,255,.04)'; for (let x = 0; x < W; x += 46) c.fillRect(x, 0, 23, 440);
    c.fillStyle = '#3b1f33'; c.fillRect(0, 395, W, 45);
    c.fillStyle = '#c98b3c'; c.fillRect(0, 392, W, 6);
    // floor: chequerboard lino, the classic record-shop floor
    for (let y = 440, row = 0; y < H; y += 46, row++) for (let x = -46, col = 0; x < W; x += 46, col++) {
      c.fillStyle = (row + col) % 2 ? '#e9dcc6' : '#2a2230'; c.fillRect(x + (row % 2) * 0, y, 46, 46);
    }
    const fl = c.createLinearGradient(0, 440, 0, H); fl.addColorStop(0, 'rgba(40,10,30,.45)'); fl.addColorStop(1, 'rgba(40,10,30,0)'); c.fillStyle = fl; c.fillRect(0, 440, W, H - 440);

    // window onto the high street (sky follows the clock)
    windowView(c, 26, 70, 230, 270, st);
    // door with bell
    c.fillStyle = '#2a1a24'; c.fillRect(272, 112, 112, 330);
    c.fillStyle = '#3f6e5e'; c.fillRect(280, 120, 96, 322);
    c.fillStyle = 'rgba(180,220,255,.25)'; c.fillRect(292, 134, 72, 150);
    c.fillStyle = '#f4efe1'; c.font = '700 13px Fredoka, "Trebuchet MS", sans-serif'; c.textAlign = 'center';
    rr(c, 296, 296, 64, 26, 4); c.fill(); c.fillStyle = st.open ? '#2fb35a' : '#d12d2d'; c.fillText(st.open ? 'OPEN' : 'CLOSED', 328, 314);
    c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(366, 290, 5, 0, TAU); c.fill();
    const bell = st.bell > 0 ? Math.sin(t * 40) * st.bell * 0.6 : 0;
    c.save(); c.translate(328, 112); c.rotate(bell); c.fillStyle = '#ffd34d'; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(-10, 16); c.quadraticCurveTo(-10, 2, 0, 2); c.quadraticCurveTo(10, 2, 10, 16); c.closePath(); c.fill(); c.stroke(); c.restore();

    // shop sign over the back wall
    c.textAlign = 'center';
    rr(c, 450, 64, 400, 54, 12); c.fillStyle = '#1e1020'; c.fill();
    c.font = '36px "Luckiest Guy", Fredoka, "Trebuchet MS", sans-serif';
    const glow = st.up.neon ? 0.75 + Math.sin(t * 3) * 0.08 + (Math.random() < 0.01 ? -0.4 : 0) : 0;
    c.shadowColor = '#ff5fa2'; c.shadowBlur = glow ? 18 : 0; c.fillStyle = glow ? `rgba(255,120,190,${glow + 0.25})` : '#f2a93b';
    c.fillText('CHUNGY\'S RECORDS', 650, 106); c.shadowBlur = 0;
    if (st.pipSign) { c.fillStyle = '#ffd34d'; for (let i = 0; i < 14; i++) { const a = t * 2 + i; c.globalAlpha = 0.5 + 0.5 * Math.sin(a * 3); c.beginPath(); c.arc(460 + (i * 31) % 380, 68 + (i * 17) % 46, 2, 0, TAU); c.fill(); } c.globalAlpha = 1; }

    // shelves of records on the back wall
    for (let s = 0; s < 2; s++) {
      const sy = 128 + s * 112;
      c.fillStyle = '#4a2a1a'; c.fillRect(420, sy + 82, 460, 12);
      for (let i = 0; i < 17; i++) {
        const seed = (i * 7 + s * 13) % 10;
        const recs = st.shelf || [];
        const col = recs.length ? recs[(i + s * 17) % recs.length] : ['#e5483b', '#2f9bff', '#ffcf3f', '#2fb35a', '#b14bff'][seed % 5];
        c.fillStyle = col; c.fillRect(428 + i * 26, sy + 14 + (seed % 3) * 2, 22, 68 - (seed % 3) * 2);
        c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(428 + i * 26 + 18, sy + 14 + (seed % 3) * 2, 4, 68 - (seed % 3) * 2);
      }
    }
    // wall of fame frames
    const frames = st.wallRecs || [];
    for (let i = 0; i < (st.wallSlots || 0); i++) {
      const fx = 900 + (i % 4) * 92, fy = 92 + Math.floor(i / 4) * 104;
      c.fillStyle = '#c98b3c'; c.fillRect(fx - 6, fy - 6, 84, 84);
      c.fillStyle = '#2a1a24'; c.fillRect(fx, fy, 72, 72);
      if (frames[i]) { c.drawImage(sleeveCanvas(frames[i], 160), fx + 2, fy + 2, 68, 68); if (frames[i].rarity === 'L') sparkle(c, fx + 36, fy + 36, 40, t); }
      else { c.fillStyle = 'rgba(255,255,255,.18)'; c.font = '12px sans-serif'; c.fillText('empty', fx + 36, fy + 40); }
    }
    if (!st.wallSlots) { // posters
      poster(c, 912, 96, '#2f9bff', 'LIVE!', t); poster(c, 1030, 110, '#ffcf3f', 'VINYL', t); poster(c, 1150, 92, '#2fb35a', 'DUB', t);
    }
    // speakers
    if (st.up.speakers) for (const sx of [400, 1236]) speaker(c, sx, 150, st.up.speakers, st.beat);
    // listening booth
    if (st.up.booth) {
      c.fillStyle = '#3b2a4a'; rr(c, 120, 330, 130, 120, 8); c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke();
      c.fillStyle = '#f2a93b'; c.font = '700 14px Fredoka, "Trebuchet MS"'; c.fillText('LISTEN', 185, 352);
      c.strokeStyle = '#222'; c.lineWidth = 5; c.beginPath(); c.arc(185, 396, 18, Math.PI, TAU); c.stroke(); c.fillStyle = '#e23b3b'; rr(c, 163, 392, 10, 16, 4); c.fill(); rr(c, 197, 392, 10, 16, 4); c.fill();
    }
    // coffee corner
    if (st.up.coffee) { c.fillStyle = '#2a1a24'; rr(c, 1188, 300, 64, 82, 6); c.fill(); c.fillStyle = '#c0c4cc'; rr(c, 1194, 306, 52, 30, 4); c.fill(); c.fillStyle = '#fff'; rr(c, 1210, 352, 20, 22, 3); c.fill(); for (let i = 0; i < 3; i++) { c.strokeStyle = `rgba(255,255,255,${0.3 + 0.2 * Math.sin(t * 3 + i)})`; c.lineWidth = 2; c.beginPath(); c.moveTo(1214 + i * 6, 346); c.quadraticCurveTo(1210 + i * 6 + Math.sin(t * 2 + i) * 4, 330, 1216 + i * 6, 318); c.stroke(); } }
    // record bins (crates) in the middle of the floor
    for (let i = 0; i < 2 + Math.min(st.up.rack, 3); i++) bin(c, 420 + i * 112, 470, st.binCols ? st.binCols[i % st.binCols.length] : null, i);
  }

  function bin(c, x, y, cols, i) {
    // crate on legs, full of sleeves
    c.fillStyle = '#6b3e22'; c.fillRect(x + 6, y + 56, 8, 34); c.fillRect(x + 86, y + 56, 8, 34);
    const sl = cols || ['#e5483b', '#2f9bff', '#ffcf3f', '#2fb35a', '#b14bff', '#ff3fa4'];
    for (let k = 0; k < 7; k++) { c.fillStyle = sl[(k + i * 2) % sl.length]; c.save(); c.translate(x + 14 + k * 11, y + 6); c.rotate(-0.25 + k * 0.03); c.fillRect(0, -26, 34, 40); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(28, -26, 6, 40); c.restore(); }
    c.fillStyle = '#8a5530'; c.strokeStyle = OUT; c.lineWidth = 3; rr(c, x, y + 6, 100, 54, 6); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 4, y + 33); c.lineTo(x + 96, y + 33); c.stroke();
  }

  function poster(c, x, y, col, txt, t) {
    c.save(); c.translate(x + 45, y + 60); c.rotate(Math.sin(x) * 0.06);
    c.fillStyle = col; c.fillRect(-45, -60, 90, 120); c.fillStyle = '#1b1820'; c.beginPath(); c.arc(0, -8, 30, 0, TAU); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(0, -8, 9, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.font = '900 18px Fredoka, "Trebuchet MS"'; c.textAlign = 'center'; c.fillText(txt, 0, 46); c.restore();
  }

  function speaker(c, x, y, lvl, beat) {
    const s = 1 + 0.25 * (lvl - 1), k = 1 + (beat || 0) * 0.08;
    c.fillStyle = '#1d1a20'; c.strokeStyle = OUT; c.lineWidth = 3; rr(c, x - 26 * s, y, 52 * s, 96 * s, 6); c.fill(); c.stroke();
    c.fillStyle = '#3a3640'; c.beginPath(); c.arc(x, y + 30 * s, 16 * s * k, 0, TAU); c.fill(); c.beginPath(); c.arc(x, y + 70 * s, 11 * s * k, 0, TAU); c.fill();
  }

  function sparkle(c, x, y, r, t) {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { const a = t * 1.5 + i * 1.6, d = r * (0.4 + 0.5 * Math.abs(Math.sin(t + i))); const px = x + Math.cos(a) * d, py = y + Math.sin(a * 1.3) * d; const s = 3 + 3 * Math.abs(Math.sin(t * 3 + i)); c.fillStyle = 'rgba(255,230,140,.85)'; c.beginPath(); c.moveTo(px, py - s * 2); c.lineTo(px + s * 0.5, py); c.lineTo(px, py + s * 2); c.lineTo(px - s * 0.5, py); c.closePath(); c.fill(); c.beginPath(); c.moveTo(px - s * 2, py); c.lineTo(px, py + s * 0.5); c.lineTo(px + s * 2, py); c.lineTo(px, py - s * 0.5); c.closePath(); c.fill(); }
    c.restore();
  }

  function windowView(c, x, y, w, h, st) {
    const k = st.clock || 0;
    const top = k < 0.75 ? '#7ec8f2' : '#f0915a', bot = k < 0.75 ? '#d7f0ff' : '#ffd0a0';
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    const sky = c.createLinearGradient(0, y, 0, y + h); sky.addColorStop(0, st.rain ? '#7d8796' : top); sky.addColorStop(1, st.rain ? '#b8c0cc' : bot); c.fillStyle = sky; c.fillRect(x, y, w, h);
    // buildings across the street
    const bcol = ['#b9614a', '#8c4a3a', '#d2a46a', '#7a6a8a'];
    for (let i = 0; i < 4; i++) { c.fillStyle = bcol[i]; c.fillRect(x + i * 62 - 10, y + 70 + (i % 2) * 24, 60, h); c.fillStyle = 'rgba(255,240,180,.55)'; for (let r = 0; r < 4; r++) for (let q = 0; q < 2; q++) c.fillRect(x + i * 62 + q * 24, y + 90 + (i % 2) * 24 + r * 38, 12, 18); }
    c.fillStyle = '#5b5f68'; c.fillRect(x, y + h - 40, w, 40);
    // passers-by
    for (let i = 0; i < 3; i++) { const px = x + ((st.t * (24 + i * 9) + i * 120) % (w + 60)) - 30; c.fillStyle = ['#e5483b', '#2f9bff', '#2fb35a'][i]; rr(c, px, y + h - 76, 18, 36, 6); c.fill(); c.fillStyle = '#e9b98f'; c.beginPath(); c.arc(px + 9, y + h - 84, 9, 0, TAU); c.fill(); }
    if (st.rain) { c.strokeStyle = 'rgba(220,235,255,.6)'; c.lineWidth = 1.5; for (let i = 0; i < 40; i++) { const rx = x + ((i * 47 + st.t * 60) % w), ry = y + ((i * 31 + st.t * 420) % h); c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx - 3, ry + 12); c.stroke(); } }
    c.restore();
    // frame, window display and lettering
    c.strokeStyle = '#2a1a24'; c.lineWidth = 10; c.strokeRect(x, y, w, h);
    c.fillStyle = 'rgba(255,255,255,.08)'; c.beginPath(); c.moveTo(x + 20, y); c.lineTo(x + 70, y); c.lineTo(x + 10, y + h); c.lineTo(x - 40, y + h); c.fill();
    if (st.windowRec) { c.drawImage(sleeveCanvas(st.windowRec, 160), x + w / 2 - 40, y + h - 96, 80, 80); }
    if (st.up.neon) { c.save(); c.shadowColor = '#39f0d0'; c.shadowBlur = 14; c.strokeStyle = '#7ff7e4'; c.lineWidth = 4; c.beginPath(); c.arc(x + 60, y + 50, 26, 0, TAU); c.stroke(); c.beginPath(); c.arc(x + 60, y + 50, 7, 0, TAU); c.stroke(); c.font = '900 22px Fredoka, "Trebuchet MS"'; c.fillStyle = '#ff9fd0'; c.shadowColor = '#ff5fa2'; c.fillText('VINYL', x + 150, y + 58); c.restore(); }
    c.fillStyle = '#3b1f33'; c.fillRect(x - 10, y + h + 5, w + 20, 70);
  }

  // The counter, till and turntable sit in front of Chungy
  function counter(c, st) {
    const t = st.t;
    c.fillStyle = '#2a1a24'; c.fillRect(900, 452, 380, 14);
    c.fillStyle = '#8a5530'; c.strokeStyle = OUT; c.lineWidth = 4; rr(c, 896, 462, 390, 160, 8); c.fill(); c.stroke();
    c.fillStyle = '#6b3e22'; for (let i = 0; i < 6; i++) c.fillRect(910 + i * 64, 480, 40, 128);
    c.fillStyle = '#c98b3c'; c.fillRect(896, 456, 390, 12);
    // turntable
    c.fillStyle = '#d9cbb0'; c.strokeStyle = OUT; c.lineWidth = 3; rr(c, 920, 392, 150, 66, 8); c.fill(); c.stroke();
    c.save(); c.translate(984, 425); c.scale(1, 0.42); vinyl(c, 0, 0, 56, st.ang || 0, st.npCol); c.restore();
    c.strokeStyle = '#7d7d86'; c.lineWidth = 4; c.beginPath(); c.moveTo(1056, 402); c.lineTo(1050, 430); c.lineTo(1018, 438); c.stroke();
    // till
    c.fillStyle = '#3a3640'; rr(c, 1170, 382, 96, 78, 8); c.fill(); c.stroke();
    c.fillStyle = '#7ff7a4'; rr(c, 1180, 390, 76, 22, 3); c.fill();
    c.fillStyle = '#16121a'; c.font = '700 15px monospace'; c.textAlign = 'right'; c.fillText('£' + (st.cash | 0), 1252, 407); c.textAlign = 'center';
    c.fillStyle = '#c0c4cc'; for (let i = 0; i < 6; i++) { rr(c, 1182 + (i % 3) * 25, 420 + Math.floor(i / 3) * 16, 20, 11, 2); c.fill(); }
  }

  G.CRS_ART = { person, chungy, cat, shop, counter, sleeveCanvas, sleeveDataURL, vinyl, sparkle, rr, shade, CHUNGY };
})(typeof window !== 'undefined' ? window : globalThis);
