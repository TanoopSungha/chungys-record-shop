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
    const t = o.t || 0, seed = L.seed || 0;
    const step = o.walk != null ? Math.sin(o.walk) : 0;
    const stride = o.walk != null ? Math.cos(o.walk) : 0;
    const breathe = Math.sin(t * 2.2 + seed);
    const bob = (o.walk != null ? Math.abs(stride) * 4.5 : breathe * 1.4) + (o.groove || 0) * 5;
    const sway = (o.walk != null ? step * 0.025 : Math.sin(t * 1.1 + seed) * 0.012) + (o.groove ? Math.sin(t * 6) * 0.035 * o.groove : 0);
    c.lineWidth = 3.2; c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = OUT;
    const legH = 62 * h, torsoH = 82 * h, bw = 30 * b * (1 + breathe * 0.012);
    const hipY = -legH - bob, shY = hipY - torsoH, headY = shY - 34;
    // shadow
    c.fillStyle = 'rgba(30,10,20,.24)'; c.beginPath(); c.ellipse(0, 2, bw * 1.42 * (1 - bob * 0.01), 8.5, 0, 0, TAU); c.fill();
    // articulated legs (thigh -> knee -> shin -> shoe)
    const legCol = L.legs || '#2b3a67';
    for (const sgn of [-1, 1]) {
      const ph = o.walk != null ? o.walk + (sgn < 0 ? 0 : Math.PI) : 0;
      const sSin = o.walk != null ? Math.sin(ph) : 0;
      const lift = o.walk != null ? Math.max(0, -Math.cos(ph)) * 12 : 0;
      const sw = sSin * 11;
      const hx = sgn * bw * 0.45, hy0 = hipY - 2;
      const kx = hx + sw * 0.55 + (lift * 0.25), ky = hy0 + (legH * 0.5) - lift * 0.4;
      const fx = hx + sw, fy = -8 - lift;
      c.strokeStyle = OUT; c.lineWidth = 24; c.beginPath(); c.moveTo(hx, hy0); c.quadraticCurveTo(kx, ky, fx, fy); c.stroke();
      c.strokeStyle = sgn < 0 ? shade(legCol, -0.1) : legCol; c.lineWidth = 18; c.beginPath(); c.moveTo(hx, hy0); c.quadraticCurveTo(kx, ky, fx, fy); c.stroke();
      // knee highlight
      c.fillStyle = 'rgba(255,255,255,.1)'; c.beginPath(); c.arc(kx, ky, 4, 0, TAU); c.fill();
      // shoe with sole and laces
      c.save(); c.translate(fx + sgn * 2, fy + 2); c.rotate(o.walk != null ? sSin * 0.18 - lift * 0.015 : 0);
      c.fillStyle = L.shoes || '#231a1a'; c.lineWidth = 3.2; c.strokeStyle = OUT;
      rr(c, -13, -6, 28, 13, 6); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-11, 3, 24, 2.2);
      c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(2, -4); c.lineTo(6, -2); c.moveTo(5, -4); c.lineTo(9, -2); c.stroke();
      c.restore();
    }
    c.save(); c.translate(0, hipY); c.rotate(sway); c.translate(0, -hipY);
    // long hair behind
    hairBack(c, L, headY, t);
    // articulated arms with elbow bend and thumb/hand
    const arm = o.arm || 'idle';
    const sleeve = topColour(L);
    const handCol = L.skin;
    function limb(sx, sy, ex, ey, bendDir) {
      const mx = (sx + ex) * 0.5 + (bendDir || 0), my = (sy + ey) * 0.5 + Math.abs(bendDir || 0) * 0.25;
      c.strokeStyle = OUT; c.lineWidth = 17.5; c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
      c.strokeStyle = sleeve; c.lineWidth = 11.5; c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
      // cuff / forearm shade
      const ang = Math.atan2(ey - my, ex - mx);
      c.save(); c.translate(ex, ey); c.rotate(ang);
      c.fillStyle = handCol; c.lineWidth = 3; c.strokeStyle = OUT;
      c.beginPath(); c.ellipse(0, 0, 8, 6.8, 0, 0, TAU); c.fill(); c.stroke();
      c.beginPath(); c.arc(-2, -5.5 * (sx < 0 ? -1 : 1), 3.2, 0, TAU); c.fill(); c.stroke();
      c.restore();
    }
    const swing = o.walk != null ? step * 11 : Math.sin(t * 1.6 + seed) * 2.5;
    const talkWave = o.face === 'talk' ? Math.sin(t * 9) * 5 : 0;
    const ax = bw + 1, ay = shY + 12;
    const arms = {
      idle: [[-ax, ay, -ax - 7 - swing * 0.3, hipY + 6 + swing - talkWave * 0.4, -5], [ax, ay, ax + 7 + swing * 0.3, hipY + 6 - swing + talkWave, 5]],
      wave: [[-ax, ay, -ax - 8, hipY + 6, -5], [ax, ay, ax + 28 + Math.cos(t * 10) * 4, ay - 42 + Math.sin(t * 12) * 8, 12]],
      cheer: [[-ax, ay, -ax - 24, ay - 54 + Math.sin(t * 14) * 5, -10], [ax, ay, ax + 24, ay - 54 - Math.sin(t * 14) * 5, 10]],
      hold: [[-ax, ay, -10, ay + 30, -12], [ax, ay, 10, ay + 30, 12]],
      cross: [[-ax, ay, bw * 0.55, ay + 26, -10], [ax, ay, -bw * 0.55, ay + 30, 10]],
      point: [[-ax, ay, -ax - 8, hipY + 6, -5], [ax, ay, ax + 42, ay + 2, 6]],
      think: [[-ax, ay, -ax - 8, hipY + 6, -5], [ax, ay, 14, headY + 30, 16]],
      dig: [[-ax, ay, -16, hipY - 4 + Math.sin(t * 7) * 5, -12], [ax, ay, 18, hipY - 8 + Math.cos(t * 7) * 5, 12]],
    }[arm] || [[-ax, ay, -ax - 7, hipY + 6, -5], [ax, ay, ax + 7, hipY + 6, 5]];
    // torso
    torso(c, L, bw, shY, hipY, torsoH);
    if (L.bag) bag(c, L, bw, shY, hipY);
    if (arm !== 'cross' && arm !== 'hold' && arm !== 'dig') arms.forEach(a => limb(...a));
    // neck + head with expressive tilt
    c.fillStyle = L.skin; c.strokeStyle = OUT; c.lineWidth = 3; rr(c, -9, shY - 12, 18, 16, 5); c.fill(); c.stroke();
    const headTilt = (o.tilt || 0) + (o.face === 'talk' ? Math.sin(t * 8) * 0.04 : o.face === 'joy' ? Math.sin(t * 6) * 0.03 : 0) + (o.groove ? Math.sin(t * 8) * 0.06 * o.groove : 0);
    c.save(); c.translate(0, headY); c.rotate(headTilt); c.translate(0, -headY);
    head(c, L, headY, o);
    c.restore();
    if (arm === 'cross' || arm === 'hold' || arm === 'dig') arms.forEach(a => limb(...a));
    if (arm === 'hold' && o.holdCol) { // a record sleeve held to the chest
      c.save(); c.translate(0, ay + 10); c.rotate(-0.08 + Math.sin(t * 3) * 0.02); c.fillStyle = o.holdCol; c.lineWidth = 3; rr(c, -26, -26, 52, 52, 3); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(0, 0, 12, 0, TAU); c.fill(); c.restore();
    }
    c.restore();
    c.restore();
  }

  function bag(c, L, bw, shY, hipY) {
    // a canvas tote bag with a record printed on it
    c.strokeStyle = OUT; c.lineWidth = 3;
    c.strokeStyle = shade(L.bag, -0.3); c.lineWidth = 4; c.beginPath(); c.moveTo(-bw * 0.4, shY + 2); c.lineTo(-bw - 8, hipY - 30); c.stroke();
    c.fillStyle = L.bag; c.strokeStyle = OUT; c.lineWidth = 3; rr(c, -bw - 22, hipY - 34, 34, 40, 4); c.fill(); c.stroke();
    c.fillStyle = '#1b1820'; c.beginPath(); c.arc(-bw - 5, hipY - 12, 9, 0, TAU); c.fill(); c.fillStyle = '#ff5fa2'; c.beginPath(); c.arc(-bw - 5, hipY - 12, 3, 0, TAU); c.fill();
  }

  function topColour(L) { return L.top === 'leather' ? '#1d1a1f' : L.top === 'denim' ? '#4d6fa8' : L.col; }

  function torso(c, L, bw, shY, hipY, th) {
    const col = topColour(L);
    c.fillStyle = col; c.strokeStyle = OUT; c.lineWidth = 3.2;
    rr(c, -bw, shY, bw * 2, th + 6, Math.min(26, bw)); c.fill(); c.stroke();
    c.save(); rr(c, -bw, shY, bw * 2, th + 6, Math.min(26, bw)); c.clip();
    if (L.pattern === 'stripes' && (L.top === 'tee' || L.top === 'turtleneck' || L.top === 'shirt')) { c.fillStyle = shade(col, col === '#111' || col === '#222' ? 0.35 : -0.25); for (let y = shY + 8; y < hipY; y += 14) c.fillRect(-bw, y, bw * 2, 6); }
    if (L.pattern === 'spots' && L.top !== 'leather') { c.fillStyle = shade(col, 0.45); for (let i = 0; i < 14; i++) { c.beginPath(); c.arc(-bw + ((i * 29) % (bw * 2)), shY + 10 + ((i * 41) % th), 3.5, 0, TAU); c.fill(); } }
    const sh = c.createLinearGradient(-bw, 0, bw, 0); sh.addColorStop(0, 'rgba(255,255,255,.18)'); sh.addColorStop(0.55, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.22)');
    c.fillStyle = sh; c.fillRect(-bw, shY, bw * 2, th + 6); c.restore();
    c.strokeStyle = OUT; c.lineWidth = 3.2; rr(c, -bw, shY, bw * 2, th + 6, Math.min(26, bw)); c.stroke();
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

  function hairBack(c, L, hy, t) {
    const hc = L.hairCol, sw = Math.sin((t || 0) * 2.5 + (L.seed || 0)) * 1.5;
    c.fillStyle = hc; c.strokeStyle = OUT; c.lineWidth = 3.2;
    if (L.hair === 'long') { rr(c, -40 + sw * 0.4, hy - 22, 80, 96, 30); c.fill(); c.stroke(); }
    else if (L.hair === 'locs') { for (let i = -4; i <= 4; i++) { rr(c, i * 9 - 5 + sw * 0.3, hy - 6, 11, 80 - Math.abs(i) * 4, 5); c.fill(); c.stroke(); } }
    else if (L.hair === 'braids') { for (const s of [-1, 1]) { rr(c, s * 34 - 6 + sw * 0.3, hy - 6, 12, 64, 6); c.fill(); c.stroke(); } }
    else if (L.hair === 'afro') { c.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; c.moveTo(Math.cos(a) * 44, hy - 8 + Math.sin(a) * 40); c.arc(Math.cos(a) * 44, hy - 8 + Math.sin(a) * 40, 14, 0, TAU); } c.fill(); c.beginPath(); c.arc(0, hy - 8, 48, 0, TAU); c.fill(); c.stroke(); }
    else if (L.hair === 'curly') { c.beginPath(); for (let i = 0; i < 11; i++) { const a = Math.PI + i / 10 * Math.PI; c.moveTo(Math.cos(a) * 36, hy - 4 + Math.sin(a) * 32); c.arc(Math.cos(a) * 36, hy - 4 + Math.sin(a) * 32, 11, 0, TAU); } c.fill(); }
    else if (L.hair === 'bob') { rr(c, -40, hy - 30, 80, 66, 26); c.fill(); c.stroke(); }
    else if (L.hair === 'hood') { c.fillStyle = shade(L.col, -0.1); c.beginPath(); c.arc(0, hy - 2, 44, 0, TAU); c.fill(); c.stroke(); }
  }

  function head(c, L, hy, o) {
    const R = 34;
    c.fillStyle = L.skin; c.strokeStyle = OUT; c.lineWidth = 3.2;
    // soft chin shadow on neck + detailed ears
    c.fillStyle = 'rgba(60,20,30,.18)'; c.beginPath(); c.ellipse(0, hy + R + 2, 16, 6, 0, 0, TAU); c.fill(); c.fillStyle = L.skin;
    for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * (R - 1), hy + 4, 8, 9, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = shade(L.skin, -0.18); c.beginPath(); c.ellipse(s * (R - 1), hy + 5, 4, 5, 0, 0, TAU); c.fill(); c.fillStyle = L.skin; }
    const facePath = () => { c.beginPath(); c.moveTo(-R, hy - 4); c.bezierCurveTo(-R, hy - R * 1.32, R, hy - R * 1.32, R, hy - 4); c.bezierCurveTo(R, hy + R * 0.7, R * 0.42, hy + R * 1.08, 0, hy + R * 1.08); c.bezierCurveTo(-R * 0.42, hy + R * 1.08, -R, hy + R * 0.7, -R, hy - 4); c.closePath(); };
    facePath(); c.fill();
    const hg = c.createRadialGradient(-12, hy - 16, 4, 0, hy, R * 1.1); hg.addColorStop(0, 'rgba(255,255,255,.26)'); hg.addColorStop(0.55, 'rgba(255,255,255,0)'); hg.addColorStop(1, 'rgba(60,20,30,.2)');
    c.fillStyle = hg; facePath(); c.fill(); c.stroke(); c.fillStyle = L.skin;
    if (L.acc === 'beard') { c.fillStyle = L.hairCol; c.beginPath(); c.arc(0, hy + 6, R - 1, 0.1 * Math.PI, 0.9 * Math.PI); c.quadraticCurveTo(0, hy + R + 22, R * Math.cos(0.1 * Math.PI), hy + 6 + R * Math.sin(0.1 * Math.PI)); c.fill(); c.stroke(); }
    if (L.acc === 'earrings') { c.fillStyle = '#ffd34d'; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * (R + 2), hy + 15, 4, 0, TAU); c.fill(); } }
    face(c, L, hy, o);
    hairFront(c, L, hy, R);
    if (!['bald', 'cap', 'beret', 'tam', 'hood', 'beanie', 'buckethat'].includes(L.hair)) { c.save(); c.strokeStyle = shade(L.hairCol || '#3b2414', 0.5); c.globalAlpha = 0.55; c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath(); c.arc(-6, hy - 6, R - 4, Math.PI * 1.18, Math.PI * 1.36); c.stroke(); c.beginPath(); c.arc(-2, hy - 4, R - 10, Math.PI * 1.22, Math.PI * 1.32); c.stroke(); c.restore(); }
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
    // eyes with iris, pupil, upper lid shadow, and specular highlights
    for (const s of [-1, 1]) {
      const ex = s * 12;
      if (f === 'joy') { c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.arc(ex, ey + 3, 6, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); continue; }
      if (f === 'love') { c.fillStyle = '#ff3f7f'; c.beginPath(); c.moveTo(ex, ey + 6); c.bezierCurveTo(ex - 11, ey - 2, ex - 6, ey - 10, ex, ey - 4); c.bezierCurveTo(ex + 6, ey - 10, ex + 11, ey - 2, ex, ey + 6); c.fill(); continue; }
      if (f === 'sus' || f === 'smug') { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, ey + 1, 7, 4, 0, 0, TAU); c.fill(); c.fillStyle = '#20141c'; c.beginPath(); c.arc(ex + (f === 'sus' ? 2.5 : 0), ey + 1, 3, 0, TAU); c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(ex - 8, ey - 2); c.lineTo(ex + 8, ey - 2); c.stroke(); continue; }
      if (blink) { c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(ex - 5, ey); c.lineTo(ex + 5, ey); c.stroke(); continue; }
      const ry = f === 'wow' ? 10.5 : 9.5, rx = 8;
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, ey, rx, ry, 0, 0, TAU); c.fill();
      c.save(); c.beginPath(); c.ellipse(ex, ey, rx, ry, 0, 0, TAU); c.clip();
      const lx = ex + (o.look || 0) * 2;
      c.fillStyle = L.eyes || '#6b4226'; c.beginPath(); c.arc(lx, ey + 1.5, f === 'wow' ? 5 : 6, 0, TAU); c.fill();
      c.fillStyle = shade(L.eyes || '#6b4226', -0.45); c.beginPath(); c.arc(lx, ey + 1.5, 6, Math.PI * 1.1, Math.PI * 1.9); c.fill();
      c.fillStyle = '#140c12'; c.beginPath(); c.arc(lx, ey + 1.5, f === 'wow' ? 2.2 : 3, 0, TAU); c.fill();
      c.fillStyle = 'rgba(60,20,30,.18)'; c.fillRect(ex - rx, ey - ry, rx * 2, 3);
      c.restore();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(lx + 2, ey - 1.5, 2, 0, TAU); c.fill(); c.beginPath(); c.arc(lx - 2, ey + 4, 1, 0, TAU); c.fill();
      c.strokeStyle = OUT; c.lineWidth = 2.8; c.beginPath(); c.ellipse(ex, ey, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
      if (L.lashes) { c.lineWidth = 2.2; for (const k of [0, 1, 2]) { const a = Math.PI * (1.62 + k * 0.12); const ax = ex + Math.cos(a) * rx * s * (s > 0 ? 1 : -1), ay = ey + Math.sin(a) * ry; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + s * (3 + k), ay - 3 - k * 0.5); c.stroke(); } }
    }
    // brows
    c.strokeStyle = shade(L.hairCol || '#3b2414', -0.25); c.lineWidth = 4.4; c.lineCap = 'round';
    const tilt = f === 'cross' || f === 'angry' ? 6 : f === 'meh' ? -2 : f === 'wow' ? -4 : f === 'sad' ? -6 : 0;
    for (const s of [-1, 1]) { const tt = f === 'sus' && s > 0 ? -5 : tilt; const y0 = ey - 15 - (f === 'wow' ? 4 : 0) + (f === 'sad' ? 2 : 0); c.beginPath(); c.moveTo(s * 20, y0 + 2); c.quadraticCurveTo(s * 14, y0 - 3, s * 6, y0 + tt); c.stroke(); }
    if (f === 'angry') { c.fillStyle = 'rgba(230,40,40,.28)'; c.beginPath(); c.arc(0, hy, 33, 0, TAU); c.fill(); c.strokeStyle = '#c3001b'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(20, hy - 30); c.lineTo(28, hy - 22); c.moveTo(28, hy - 30); c.lineTo(20, hy - 22); c.stroke(); }
    // cheeks
    { const strong = f === 'joy' || f === 'happy' || f === 'love'; for (const s of [-1, 1]) { const bg = c.createRadialGradient(s * 21, hy + 11, 1, s * 21, hy + 11, 10); bg.addColorStop(0, `rgba(255,90,110,${strong ? 0.45 : 0.2})`); bg.addColorStop(1, 'rgba(255,90,110,0)'); c.fillStyle = bg; c.beginPath(); c.arc(s * 21, hy + 11, 10, 0, TAU); c.fill(); } }
    // nose
    c.fillStyle = shade(L.skin, -0.12); c.beginPath(); c.ellipse(0, hy + 8, 5, 4, 0, 0, TAU); c.fill(); c.fillStyle = shade(L.skin, -0.4); for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 2.6, hy + 10, 1.4, 1, 0, 0, TAU); c.fill(); } c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(-1.5, hy + 6, 1.4, 0, TAU); c.fill();
    // mouth
    c.strokeStyle = OUT; c.lineWidth = 3; c.fillStyle = '#7a1f2e';
    const my = hy + 18;
    if (f === 'joy') { c.beginPath(); c.arc(0, my - 3, 11, 0.05 * Math.PI, 0.95 * Math.PI); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.fillRect(-7, my - 3, 14, 3); }
    else if (f === 'happy') { c.beginPath(); c.arc(0, my - 6, 9, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
    else if (f === 'wow') { c.beginPath(); c.ellipse(0, my, 5, 7, 0, 0, TAU); c.fill(); c.stroke(); }
    else if (f === 'cross') { c.beginPath(); c.arc(0, my + 6, 9, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke(); }
    else if (f === 'meh') { c.beginPath(); c.moveTo(-7, my); c.lineTo(7, my - 2); c.stroke(); }
    else if (f === 'talk') {
      const openH = 3.5 + Math.abs(Math.sin((o.t || 0) * 18)) * 4.5;
      c.beginPath(); c.ellipse(0, my - 1, 7.5, openH, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#e06377'; c.beginPath(); c.ellipse(0, my + openH * 0.35, 4.5, openH * 0.4, 0, 0, Math.PI); c.fill();
      c.fillStyle = '#fff'; c.fillRect(-5, my - openH + 0.5, 10, 2.2);
    }
    else if (f === 'sad') { c.beginPath(); c.arc(0, my + 6, 8, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke(); c.fillStyle = '#7fc8ff'; c.beginPath(); c.moveTo(-12, ey + 8); c.quadraticCurveTo(-17, ey + 18, -12, ey + 20); c.quadraticCurveTo(-7, ey + 18, -12, ey + 8); c.fill(); }
    else if (f === 'angry') { c.fillStyle = '#7a1f2e'; c.beginPath(); c.ellipse(0, my + 1, 9, 4, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.fillRect(-7, my - 1, 14, 2); }
    else if (f === 'smug') { c.beginPath(); c.moveTo(-8, my - 1); c.quadraticCurveTo(2, my + 3, 10, my - 6); c.stroke(); }
    else if (f === 'sus') { c.beginPath(); c.moveTo(-7, my); c.lineTo(7, my); c.stroke(); }
    else if (f === 'love') { c.beginPath(); c.arc(0, my - 6, 9, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
    else { c.beginPath(); c.arc(0, my - 4, 6, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); }
    if (L.lips && !['joy', 'wow', 'talk', 'angry'].includes(f)) { c.fillStyle = L.lips; c.globalAlpha = 0.85; c.beginPath(); c.ellipse(0, my + 1, 6, 2.6, 0, 0, TAU); c.fill(); c.globalAlpha = 1; }
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
  const CHUNGY = { skin: '#e9b98f', hair: 'beanie', hairCol: '#3b2414', top: 'tee', col: '#f2a93b', legs: '#2b3a67', acc: 'beard', build: 1.45, h: 1.02, seed: 3, eyes: '#5a3820' };
  function chungy(c, x, foot, sc, o) {
    o = o || {};
    person(c, CHUNGY, x, foot, sc, o);
    // apron with a record logo, and headphones round his neck
    c.save(); c.translate(x, foot); c.scale(sc, sc);
    const b = Math.sin((o.t || 0) * 2.2 + 3) * 1.4 + (o.groove || 0) * 5;
    const hipY = -62 - b, shY = hipY - 84;
    c.fillStyle = '#2f6f5e'; c.strokeStyle = OUT; c.lineWidth = 3;
    rr(c, -30, shY + 22, 60, 84, 10); c.fill(); c.stroke();
    // pocket + gold enamel pin on apron
    c.fillStyle = '#25594b'; rr(c, -20, shY + 78, 40, 20, 5); c.fill(); c.stroke();
    c.fillStyle = '#1a1a1a'; c.beginPath(); c.arc(0, shY + 54, 15, 0, TAU); c.fill();
    c.fillStyle = '#f2a93b'; c.beginPath(); c.arc(0, shY + 54, 5, 0, TAU); c.fill();
    c.strokeStyle = '#222'; c.lineWidth = 6; c.beginPath(); c.arc(0, shY - 6, 24, 0.12 * Math.PI, 0.88 * Math.PI); c.stroke();
    c.fillStyle = '#e23b3b'; for (const s of [-1, 1]) { rr(c, s * 22 - 8, shY + 2, 16, 18, 6); c.fill(); c.stroke(); }
    // pom-pom on the beanie
    c.fillStyle = '#fff4d6'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.arc(0, shY - 34 - 54, 10, 0, TAU); c.fill(); c.stroke();
    c.restore();
  }

  // ---------- the shop cat (Wax) ----------
  function cat(c, x, y, sc, t, flip, sleeping) {
    c.save(); c.translate(x, y); c.scale(sc * (flip ? -1 : 1), sc);
    c.strokeStyle = OUT; c.lineWidth = 3;
    c.fillStyle = 'rgba(30,10,20,.22)'; c.beginPath(); c.ellipse(0, 2, 34, 6.5, 0, 0, TAU); c.fill();
    c.fillStyle = '#ef9a3a';
    if (sleeping) {
      const br = Math.sin(t * 2.5) * 1.2;
      c.beginPath(); c.ellipse(0, -14 - br * 0.5, 30, 16 + br, 0, 0, TAU); c.fill(); c.stroke();
      // curled tail
      c.beginPath(); c.arc(-18, -10, 12, 0.2 * Math.PI, 1.3 * Math.PI); c.stroke();
      c.beginPath(); c.arc(22, -20, 13, 0, TAU); c.fill(); c.stroke();
      c.strokeStyle = OUT; c.beginPath(); c.moveTo(17, -20); c.lineTo(22, -19); c.moveTo(25, -19); c.lineTo(30, -20); c.stroke();
      // floating zzz
      c.fillStyle = 'rgba(255,244,220,.75)'; c.font = '700 12px Fredoka, sans-serif';
      c.fillText('z', 34, -32 - ((t * 12) % 14)); c.fillText('Z', 42, -40 - ((t * 12 + 7) % 14));
      c.restore(); return;
    }
    const w = Math.sin(t * 8);
    c.beginPath(); c.moveTo(-26, -24); c.quadraticCurveTo(-48, -40 + w * 6, -40, -60 + w * 4); c.lineWidth = 8; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 5; c.strokeStyle = '#ef9a3a'; c.stroke(); c.lineWidth = 3; c.strokeStyle = OUT;
    c.beginPath(); c.ellipse(0, -24, 30, 16, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#ffe5b8'; c.beginPath(); c.ellipse(6, -18, 18, 8, 0, 0, Math.PI); c.fill();
    c.fillStyle = '#ef9a3a';
    for (const lx of [-18, -8, 10, 20]) { rr(c, lx - 4, -14 + (lx % 20 ? Math.max(0, w) * 3 : 0), 8, 16, 4); c.fill(); c.stroke(); }
    c.beginPath(); c.arc(26, -38, 15, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(16, -48); c.lineTo(18, -62); c.lineTo(26, -52); c.moveTo(30, -52); c.lineTo(38, -62); c.lineTo(38, -46); c.fill(); c.stroke();
    c.fillStyle = '#f6a6b2'; c.beginPath(); c.moveTo(18, -50); c.lineTo(19, -58); c.lineTo(24, -52); c.fill(); c.beginPath(); c.moveTo(32, -52); c.lineTo(36, -58); c.lineTo(36, -48); c.fill();
    c.fillStyle = '#2fb35a'; c.beginPath(); c.arc(21, -39, 3.2, 0, TAU); c.arc(32, -39, 3.2, 0, TAU); c.fill();
    c.fillStyle = '#20141c'; c.beginPath(); c.ellipse(21, -39, 1.3, 2.8, 0, 0, TAU); c.ellipse(32, -39, 1.3, 2.8, 0, 0, TAU); c.fill();
    c.fillStyle = '#f6a6b2'; c.beginPath(); c.arc(27, -35, 2.2, 0, TAU); c.fill();
    // whiskers
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(18, -35); c.lineTo(8, -37); c.moveTo(18, -33); c.lineTo(8, -32); c.moveTo(34, -35); c.lineTo(44, -37); c.moveTo(34, -33); c.lineTo(44, -32); c.stroke();
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
    const lay = rec.rarity === 'L' ? 0 : Math.floor(r() * 3);
    if (lay === 1) sleevePortrait(c, S, r, A, B, style);
    else if (lay === 2) sleeveType(c, S, r, A, B, rec);
    else switch (style) {
      case 'rock': { c.save(); c.translate(S / 2, S / 2); c.rotate(-0.5 + r()); for (let i = -6; i < 6; i++) { c.fillStyle = i % 2 ? A : B; c.fillRect(i * S * 0.12, -S, S * 0.06, S * 2); } c.restore(); c.fillStyle = shade(A, -0.4); c.beginPath(); c.arc(S * (0.3 + r() * 0.4), S * (0.3 + r() * 0.4), S * 0.22, 0, TAU); c.fill(); break; }
      case 'punk': { for (let i = 0; i < 7; i++) { c.save(); c.translate(r() * S, r() * S); c.rotate(r() - 0.5); c.fillStyle = P(); c.fillRect(-S * 0.25, -S * 0.12, S * 0.5, S * 0.24); c.restore(); } c.strokeStyle = '#111'; c.lineWidth = S * 0.03; c.beginPath(); for (let i = 0; i < 5; i++) c.lineTo(r() * S, r() * S); c.stroke(); break; }
      case 'metal': { c.fillStyle = B; c.beginPath(); c.moveTo(S * 0.5, S * 0.08); for (let i = 0; i < 10; i++) c.lineTo(S * (0.1 + r() * 0.8), S * (0.2 + i * 0.07)); c.lineTo(S * 0.5, S * 0.9); c.fill(); c.strokeStyle = A; c.lineWidth = 2; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(S / 2, S / 2); c.lineTo(S / 2 + Math.cos(i) * S, S / 2 + Math.sin(i * 1.7) * S); c.stroke(); } break; }
      case 'soul': { const gr = c.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, B); gr.addColorStop(1, A); c.fillStyle = gr; c.fillRect(0, 0, S, S); c.fillStyle = '#ffe9b0'; c.beginPath(); c.arc(S * 0.5, S * 0.58, S * 0.28, 0, TAU); c.fill(); c.fillStyle = shade(B, -0.5); c.beginPath(); c.arc(S * 0.5, S * 0.42, S * 0.11, 0, TAU); c.fill(); rr(c, S * 0.36, S * 0.52, S * 0.28, S * 0.5, S * 0.1); c.fill(); break; }
      case 'jazz': { for (let i = 0; i < 4; i++) { c.fillStyle = P(); c.fillRect(r() * S * 0.6, r() * S * 0.6, S * (0.15 + r() * 0.5), S * (0.08 + r() * 0.3)); } c.fillStyle = bg === '#f4efe1' ? '#1f2b5c' : '#f4efe1'; c.font = `900 ${S * 0.3}px Georgia, serif`; c.fillText(rec.artist.split(' ').pop().slice(0, 5).toUpperCase(), S * 0.06, S * 0.92); break; }
      case 'hiphop': { // graffiti blobs behind a big boombox
        for (let i = 0; i < 8; i++) { c.fillStyle = P(); c.beginPath(); c.arc(r() * S, r() * S, S * (0.08 + r() * 0.2), 0, TAU); c.fill(); }
        c.strokeStyle = '#1b1820'; c.lineWidth = S * 0.035; c.beginPath(); c.moveTo(S * 0.3, S * 0.42); c.lineTo(S * 0.36, S * 0.3); c.lineTo(S * 0.64, S * 0.3); c.lineTo(S * 0.7, S * 0.42); c.stroke();
        c.fillStyle = '#1b1820'; rr(c, S * 0.1, S * 0.4, S * 0.8, S * 0.36, 6); c.fill();
        c.fillStyle = '#3a3640'; for (const sx of [0.24, 0.76]) { c.beginPath(); c.arc(S * sx, S * 0.6, S * 0.1, 0, TAU); c.fill(); c.fillStyle = A; c.beginPath(); c.arc(S * sx, S * 0.6, S * 0.04, 0, TAU); c.fill(); c.fillStyle = '#3a3640'; }
        c.fillStyle = '#d8d0c0'; rr(c, S * 0.38, S * 0.5, S * 0.24, S * 0.15, 3); c.fill();
        c.fillStyle = '#1b1820'; for (const sx of [0.45, 0.55]) { c.beginPath(); c.arc(S * sx, S * 0.575, S * 0.025, 0, TAU); c.fill(); }
        c.fillStyle = B; for (let i = 0; i < 4; i++) c.fillRect(S * (0.39 + i * 0.06), S * 0.44, S * 0.04, S * 0.03);
        break; }
      case 'reggae': { const cols = ['#d12d2d', '#ffd000', '#2fb35a']; for (let i = 0; i < 3; i++) { c.fillStyle = cols[i]; c.fillRect(0, i * S / 3, S, S / 3); } c.fillStyle = '#ffe9b0'; c.beginPath(); c.arc(S * 0.5, S * 0.5, S * 0.2, 0, TAU); c.fill(); c.strokeStyle = '#ffe9b0'; c.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.beginPath(); c.moveTo(S / 2 + Math.cos(a) * S * 0.25, S / 2 + Math.sin(a) * S * 0.25); c.lineTo(S / 2 + Math.cos(a) * S * 0.38, S / 2 + Math.sin(a) * S * 0.38); c.stroke(); } break; }
      case 'house': { for (let i = 9; i > 0; i--) { c.fillStyle = i % 2 ? A : B; c.beginPath(); c.arc(S * 0.5, S * 0.5, i * S * 0.07, 0, TAU); c.fill(); } c.fillStyle = '#111'; for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) if ((x + y) % 3 === 0) { c.beginPath(); c.arc((x + 0.5) * S / 8, (y + 0.5) * S / 8, 2, 0, TAU); c.fill(); } break; }
      case 'disco': { const gr = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.8); gr.addColorStop(0, B); gr.addColorStop(1, shade(B, -0.6)); c.fillStyle = gr; c.fillRect(0, 0, S, S); c.strokeStyle = A; c.lineWidth = 2; for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; c.beginPath(); c.moveTo(S / 2, S / 2); c.lineTo(S / 2 + Math.cos(a) * S, S / 2 + Math.sin(a) * S); c.stroke(); } c.fillStyle = '#d9dde6'; c.beginPath(); c.arc(S / 2, S * 0.45, S * 0.2, 0, TAU); c.fill(); c.fillStyle = '#9aa3b5'; for (let i = 0; i < 30; i++) { c.fillRect(S / 2 - S * 0.18 + (i % 6) * S * 0.06, S * 0.3 + Math.floor(i / 6) * S * 0.06, S * 0.05, S * 0.05); } break; }
      case 'folk': { c.fillStyle = '#e8dcc0'; c.fillRect(0, 0, S, S); c.fillStyle = shade(A, -0.3); c.beginPath(); c.moveTo(0, S * 0.75); for (let x = 0; x <= S; x += S / 6) c.lineTo(x, S * (0.6 + r() * 0.15)); c.lineTo(S, S); c.lineTo(0, S); c.fill(); c.fillStyle = '#5b3b1d'; c.fillRect(S * 0.47, S * 0.35, S * 0.06, S * 0.35); c.fillStyle = '#6b8f45'; c.beginPath(); c.arc(S * 0.5, S * 0.32, S * 0.18, 0, TAU); c.fill(); break; }
    }
    // printed-paper feel: speckle and a soft vignette
    for (let i = 0; i < S * 1.2; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)'; c.fillRect(r() * S, r() * S, 1.5, 1.5); }
    const vg = c.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.28)'); c.fillStyle = vg; c.fillRect(0, 0, S, S);
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
  // Alternative cover styles so a crate doesn't look samey: a moody duotone portrait, or bold typography.
  function sleevePortrait(c, S, r, A, B, style) {
    const dark = style === 'metal' || style === 'punk' || style === 'hiphop';
    const g = c.createLinearGradient(0, 0, S, S); g.addColorStop(0, dark ? '#16121a' : B); g.addColorStop(1, dark ? shade(A, -0.4) : A);
    c.fillStyle = g; c.fillRect(0, 0, S, S);
    // halftone dots
    c.fillStyle = 'rgba(255,255,255,.12)';
    for (let y = 0; y < S; y += 7) for (let x = (y / 7 % 2) * 3.5; x < S; x += 7) { const k = (x + y) / (2 * S); c.beginPath(); c.arc(x, y, 0.6 + k * 2.4, 0, TAU); c.fill(); }
    // the artist's silhouette
    const cx = S * (0.38 + r() * 0.24);
    c.fillStyle = dark ? A : shade(A, -0.55);
    c.beginPath(); c.arc(cx, S * 0.5, S * 0.17, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(cx, S * 1.0, S * 0.36, S * 0.3, 0, Math.PI, TAU); c.fill();
    if (r() < 0.5) { c.beginPath(); c.arc(cx, S * 0.42, S * 0.2, Math.PI * 1.05, Math.PI * 1.95); c.lineWidth = S * 0.06; c.strokeStyle = c.fillStyle; c.stroke(); }
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; c.strokeRect(S * 0.06, S * 0.24, S * 0.88, S * 0.7);
  }
  function sleeveType(c, S, r, A, B, rec) {
    c.fillStyle = r() < 0.5 ? A : shade(A, -0.5); c.fillRect(0, 0, S, S);
    c.fillStyle = B; c.beginPath(); c.arc(S * (0.2 + r() * 0.6), S * (0.3 + r() * 0.5), S * (0.18 + r() * 0.2), 0, TAU); c.fill();
    const words = rec.artist.replace(/^(The|DJ|MC|Lil'|Big|Mr\.|Miss|Lady|Sir|King|Lord|Sister|Brother|Kid) /, '').split(' ');
    const ini = words.map(w => w[0]).join('').slice(0, 2).toUpperCase();
    c.save(); c.translate(S * 0.5, S * 0.66); c.rotate(-0.08 + r() * 0.16);
    c.font = `900 ${Math.round(S * 0.58)}px "Luckiest Guy", Fredoka, Impact, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = S * 0.035; c.strokeStyle = '#1b1820'; c.strokeText(ini, 0, 0); c.fillStyle = '#f4efe1'; c.fillText(ini, 0, 0);
    c.restore();
    c.fillStyle = '#1b1820'; for (let i = 0; i < 5; i++) c.fillRect(S * 0.06 + i * S * 0.05, S * 0.9, S * 0.03, S * 0.05);
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
    c.drawImage(backdrop(W, H), 0, 0);
    // fairy lights strung along the top of the wall
    fairyLights(c, W, t);
    // window onto the high street (sky follows the clock)
    windowView(c, 26, 70, 230, 270, st);
    // door with bell: it swings open when someone comes in
    c.fillStyle = '#2a1a24'; c.fillRect(272, 112, 112, 330);
    const open = Math.max(0, Math.min(1, (st.bell || 0) * 1.6));
    if (open > 0) { const g = c.createLinearGradient(280, 0, 376, 0); g.addColorStop(0, '#ffe6b0'); g.addColorStop(1, '#bfe3ff'); c.fillStyle = g; c.fillRect(280, 120, 96, 322); c.fillStyle = 'rgba(90,95,105,.6)'; c.fillRect(280, 380, 96, 62); }
    const dw = 96 * (1 - open * 0.72);
    c.fillStyle = '#3f6e5e'; c.fillRect(280, 120, dw, 322);
    c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(280, 120, dw, 6);
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 3; c.strokeRect(288, 300, dw - 16, 130);
    c.fillStyle = 'rgba(180,220,255,.25)'; c.fillRect(292, 134, Math.max(0, dw - 24), 150);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(296, 140); c.lineTo(296 + Math.max(0, dw - 50) * 0.5, 140); c.lineTo(296, 220); c.fill();
    c.fillStyle = '#f4efe1'; c.font = '700 13px Fredoka, "Trebuchet MS", sans-serif'; c.textAlign = 'center';
    if (open < 0.3) { rr(c, 296, 296, 64, 26, 4); c.fill(); c.fillStyle = st.open ? '#2fb35a' : '#d12d2d'; c.fillText(st.open ? 'OPEN' : 'CLOSED', 328, 314); c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(366, 290, 5, 0, TAU); c.fill(); }
    // doormat
    c.fillStyle = '#7a5a3a'; c.beginPath(); c.moveTo(276, 446); c.lineTo(382, 446); c.lineTo(392, 470); c.lineTo(266, 470); c.closePath(); c.fill();
    c.fillStyle = '#e9b44c'; c.font = '700 11px Fredoka, sans-serif'; c.fillText('HELLO', 329, 462);
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

    // shelves of records on the back wall: spines, with a couple of sleeves facing out
    shelves(c, st);
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
    plant(c, 404, 452, t);
    const recs = st.binRecs || [];
    const nb = 2 + Math.min(st.up.rack, 3);
    for (let i = 0; i < nb; i++) bin(c, 420 + i * 112, 470, recs.filter((_, k) => k % nb === i), i);
    // warm pools of light from the pendant lamps
    lamps(c, t, st);
  }

  function bin(c, x, y, recs, i) {
    // crate on legs, full of real sleeves from your stock (front ones lean forward so you can see the art)
    c.fillStyle = '#5b311b'; c.fillRect(x + 6, y + 56, 8, 34); c.fillRect(x + 86, y + 56, 8, 34);
    c.fillStyle = 'rgba(30,10,20,.25)'; c.beginPath(); c.ellipse(x + 50, y + 92, 56, 7, 0, 0, TAU); c.fill();
    const n = Math.min(7, Math.max(recs.length, 3));
    for (let k = 0; k < n; k++) {
      const rec = recs[k];
      c.save(); c.translate(x + 12 + k * 10, y + 10 + k * 0.5); c.rotate(-0.32 + k * 0.045);
      if (rec) { c.drawImage(sleeveCanvas(rec, 160), 0, -36, 44, 44); }
      else { c.fillStyle = ['#c9b48a', '#a7783f', '#d8c8a8'][k % 3]; c.fillRect(0, -36, 44, 44); }
      c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(38, -36, 6, 44);
      c.strokeStyle = 'rgba(42,26,36,.7)'; c.lineWidth = 1.5; c.strokeRect(0, -36, 44, 44);
      c.restore();
    }
    const g = c.createLinearGradient(0, y + 6, 0, y + 60); g.addColorStop(0, '#a5683a'); g.addColorStop(1, '#7a4527');
    c.fillStyle = g; c.strokeStyle = OUT; c.lineWidth = 3; rr(c, x, y + 6, 100, 54, 6); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 2; for (const yy of [22, 40]) { c.beginPath(); c.moveTo(x + 4, y + yy); c.lineTo(x + 96, y + yy); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(x + 4, y + 9, 92, 3);
    // little genre card stuck on the front
    if (recs[0]) { const gn = D.GENRES[recs[0].genre]; c.fillStyle = '#f4efe1'; c.save(); c.translate(x + 50, y + 46); c.rotate(-0.04); rr(c, -26, -8, 52, 16, 3); c.fill(); c.fillStyle = gn.col; c.font = '700 11px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillText(gn.name.toUpperCase(), 0, 4); c.restore(); }
  }

  // The static room: wallpaper, wainscoting and a perspective-tiled floor with a rug. Drawn once and reused.
  let bgCache = null;
  function backdrop(W, H) {
    if (bgCache) return bgCache;
    const cv = G.document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const wall = c.createLinearGradient(0, 0, 0, 400); wall.addColorStop(0, '#4a2441'); wall.addColorStop(0.6, '#6b3456'); wall.addColorStop(1, '#7e4062');
    c.fillStyle = wall; c.fillRect(0, 0, W, 440);
    // wallpaper: soft diamond lattice with little dots
    c.strokeStyle = 'rgba(255,220,240,.06)'; c.lineWidth = 2;
    for (let x = -400; x < W + 400; x += 56) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 400, 400); c.moveTo(x, 0); c.lineTo(x - 400, 400); c.stroke(); }
    c.fillStyle = 'rgba(255,210,235,.10)';
    for (let y = 28; y < 392; y += 56) for (let x = (y / 56 % 2) * 28; x < W; x += 56) { c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill(); }
    // picture rail and wainscot panels
    c.fillStyle = '#2f1729'; c.fillRect(0, 6, W, 6);
    const wn = c.createLinearGradient(0, 392, 0, 440); wn.addColorStop(0, '#45233c'); wn.addColorStop(1, '#2f1729');
    c.fillStyle = wn; c.fillRect(0, 396, W, 44);
    c.strokeStyle = 'rgba(255,220,180,.12)'; c.lineWidth = 2; for (let x = 10; x < W; x += 80) c.strokeRect(x, 404, 66, 28);
    c.fillStyle = '#d29a4c'; c.fillRect(0, 391, W, 6); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, 397, W, 3);
    // floor: chequerboard lino in perspective
    const vx = 640, vy = -500, top = 440, bot = H;
    const proj = (X, y) => vx + (X - vx) * (y - vy) / (bot - vy);
    let y0 = top, row = 0;
    while (y0 < bot) {
      const h = 26 + (y0 - top) * 0.22, y1 = Math.min(bot, y0 + h);
      for (let X = -1200, col = 0; X < W + 1200; X += 64, col++) {
        c.fillStyle = (row + col) % 2 ? '#ead9bc' : '#3a2a40';
        c.beginPath(); c.moveTo(proj(X, y0), y0); c.lineTo(proj(X + 64, y0), y0); c.lineTo(proj(X + 64, y1), y1); c.lineTo(proj(X, y1), y1); c.closePath(); c.fill();
      }
      y0 = y1; row++;
    }
    // a worn round rug under the bins
    c.save(); c.translate(660, 548); c.scale(1, 0.26);
    const rugCols = ['#b8433a', '#e9b44c', '#2f6f5e', '#e9b44c', '#b8433a'];
    rugCols.forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(0, 0, 330 - i * 52, 0, TAU); c.fill(); });
    c.strokeStyle = 'rgba(255,240,200,.35)'; c.lineWidth = 6; c.setLineDash([14, 12]); c.beginPath(); c.arc(0, 0, 300, 0, TAU); c.stroke(); c.setLineDash([]);
    c.restore();
    // shading: floor darker at the back, wall darker at the top corners
    const fl = c.createLinearGradient(0, top, 0, bot); fl.addColorStop(0, 'rgba(40,10,30,.55)'); fl.addColorStop(0.5, 'rgba(40,10,30,.15)'); fl.addColorStop(1, 'rgba(40,10,30,.0)');
    c.fillStyle = fl; c.fillRect(0, top, W, bot - top);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, top, W, 5);
    bgCache = cv; return cv;
  }

  function fairyLights(c, W, t) {
    const cols = ['#ffd34d', '#ff5fa2', '#39d0b8', '#ff8a3d', '#b48cff'];
    c.strokeStyle = '#1e1020'; c.lineWidth = 2;
    for (const [x0, x1, sag] of [[0, 440, 34], [440, 860, 26], [860, 1280, 34]]) {
      c.beginPath();
      for (let k = 0; k <= 20; k++) { const u = k / 20, x = x0 + (x1 - x0) * u, y = 14 + Math.sin(u * Math.PI) * sag; k ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
      for (let k = 1; k < 12; k++) {
        const u = k / 12, x = x0 + (x1 - x0) * u, y = 18 + Math.sin(u * Math.PI) * sag;
        const col = cols[(k + x0 / 20) % cols.length | 0], tw = 0.6 + 0.4 * Math.sin(t * 2.2 + k * 1.7 + x0);
        c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y, 0, x, y, 16); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = 0.35 * tw; c.fillStyle = g; c.fillRect(x - 16, y - 16, 32, 32); c.restore();
        c.globalAlpha = 0.7 + 0.3 * tw; c.fillStyle = col; c.beginPath(); c.ellipse(x, y + 3, 3.5, 5, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
      }
    }
  }

  function shelves(c, st) {
    const recs = st.shelfRecs || [];
    for (let s = 0; s < 2; s++) {
      const sy = 128 + s * 112, base = sy + 82;
      // bracket shadows and the plank
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(424, base + 12, 456, 8);
      let x = 428, k = 0;
      while (x < 872) {
        const idx = s * 23 + k, rec = recs.length ? recs[idx % recs.length] : null;
        const faceOut = rec && (k === 5 || k === 15) && x < 800;
        if (faceOut) { // a sleeve turned to face the shop
          c.save(); c.translate(x, base); c.rotate(-0.06);
          c.drawImage(sleeveCanvas(rec, 160), 0, -72, 72, 72); c.strokeStyle = OUT; c.lineWidth = 2; c.strokeRect(0, -72, 72, 72);
          c.restore(); x += 78; k++; continue;
        }
        const seed = (idx * 7919) % 97, w = 10 + seed % 9, h = 58 + seed % 14;
        const col = rec ? (seed % 3 ? D.GENRES[rec.genre].col : D.GENRES[rec.genre].alt) : ['#e5483b', '#2f9bff', '#ffcf3f', '#2fb35a', '#b14bff'][seed % 5];
        const lean = seed % 11 === 0 ? -0.12 : 0;
        c.save(); c.translate(x, base); c.rotate(lean);
        c.fillStyle = col; c.fillRect(0, -h, w, h);
        c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(1, -h, 2, h);
        c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(w - 3, -h, 3, h);
        c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(2, -h + 8 + seed % 20, w - 5, 2); c.fillRect(2, -h + 14 + seed % 20, w - 7, 2);
        c.restore();
        x += w + 1; k++;
      }
      const pl = c.createLinearGradient(0, base, 0, base + 12); pl.addColorStop(0, '#7a4a2a'); pl.addColorStop(1, '#4a2a1a');
      c.fillStyle = pl; c.fillRect(420, base, 460, 12); c.fillStyle = 'rgba(255,255,255,.15)'; c.fillRect(420, base, 460, 2);
      c.fillStyle = '#2a1a24'; for (const bx of [440, 860]) { c.beginPath(); c.moveTo(bx, base + 12); c.lineTo(bx + 8, base + 12); c.lineTo(bx, base + 28); c.fill(); }
    }
  }

  function plant(c, x, y, t) {
    // a big leafy plant in a terracotta pot by the door
    const sway = Math.sin(t * 0.8) * 0.03;
    c.fillStyle = 'rgba(30,10,20,.25)'; c.beginPath(); c.ellipse(x, y + 46, 26, 6, 0, 0, TAU); c.fill();
    const leaves = [[-0.9, 70], [-0.45, 92], [0, 104], [0.45, 90], [0.9, 72], [-0.2, 80], [0.25, 78]];
    leaves.forEach(([a, len], i) => {
      c.save(); c.translate(x, y); c.rotate(a + sway * (i % 2 ? 1 : -1));
      c.fillStyle = i % 2 ? '#2f8a4f' : '#3fa45f'; c.strokeStyle = OUT; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-20, -len * 0.55, 0, -len); c.quadraticCurveTo(20, -len * 0.55, 0, 0); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -4); c.lineTo(0, -len + 8); c.stroke();
      c.restore();
    });
    c.fillStyle = '#c86a3d'; c.strokeStyle = OUT; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x - 24, y); c.lineTo(x + 24, y); c.lineTo(x + 18, y + 46); c.lineTo(x - 18, y + 46); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#e08452'; rr(c, x - 27, y - 6, 54, 12, 4); c.fill(); c.stroke();
  }

  function lamps(c, t, st) {
    for (const lx of [560, 760, 1110]) {
      // cord and shade
      c.strokeStyle = '#1e1020'; c.lineWidth = 2; c.beginPath(); c.moveTo(lx, 0); c.lineTo(lx, 36); c.stroke();
      c.fillStyle = '#2f6f5e'; c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.moveTo(lx - 8, 36); c.lineTo(lx + 8, 36); c.lineTo(lx + 22, 56); c.lineTo(lx - 22, 56); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#fff3c4'; c.beginPath(); c.ellipse(lx, 57, 12, 4, 0, 0, TAU); c.fill();
      // soft cone of light + floating dust motes
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(lx, 60, 10, lx, 380, 360); g.addColorStop(0, 'rgba(255,214,140,.22)'); g.addColorStop(0.5, 'rgba(255,190,120,.07)'); g.addColorStop(1, 'rgba(255,180,120,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(lx - 20, 56); c.lineTo(lx + 20, 56); c.lineTo(lx + 260, 720); c.lineTo(lx - 260, 720); c.closePath(); c.fill();
      for (let m = 0; m < 5; m++) {
        const mx = lx + Math.sin(t * 0.4 + m * 2.1 + lx) * (25 + m * 18);
        const my = 90 + ((t * 11 + m * 68 + lx) % 290);
        const alpha = Math.sin((my - 90) / 290 * Math.PI) * 0.35;
        c.fillStyle = `rgba(255,235,180,${alpha.toFixed(2)})`;
        c.beginPath(); c.arc(mx, my, 1.6 + (m % 2) * 0.7, 0, TAU); c.fill();
      }
      c.restore();
    }
  }

  // Final grade over the whole scene: late-afternoon warmth from the window and a soft vignette.
  function post(c, W, H, st) {
    const k = st.clock || 0;
    if (k > 0.6) { c.save(); c.globalCompositeOperation = 'soft-light'; c.fillStyle = `rgba(255,140,60,${Math.min(0.45, (k - 0.6) * 1.1)})`; c.fillRect(0, 0, W, H); c.restore(); }
    if (st.rain) { c.fillStyle = 'rgba(40,60,100,.10)'; c.fillRect(0, 0, W, H); }
    const v = c.createRadialGradient(W / 2, H * 0.45, H * 0.45, W / 2, H * 0.5, H * 1.05);
    v.addColorStop(0, 'rgba(20,5,15,0)'); v.addColorStop(1, 'rgba(20,5,15,.55)');
    c.fillStyle = v; c.fillRect(0, 0, W, H);
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
    // turntable with strobe light and tonearm
    c.fillStyle = '#d9cbb0'; c.strokeStyle = OUT; c.lineWidth = 3; rr(c, 920, 392, 150, 66, 8); c.fill(); c.stroke();
    c.save(); c.translate(984, 425); c.scale(1, 0.42); vinyl(c, 0, 0, 56, st.ang || 0, st.npCol); c.restore();
    // strobe lamp & pitch fader
    c.fillStyle = st.npCol ? '#ff5fa2' : '#555'; c.beginPath(); c.arc(932, 444, 4, 0, TAU); c.fill();
    c.fillStyle = '#7d7d86'; c.fillRect(1058, 418, 4, 30); c.fillStyle = '#2a1a24'; c.fillRect(1055, 430, 10, 5);
    c.fillStyle = '#555'; c.beginPath(); c.arc(1056, 402, 6, 0, TAU); c.fill();
    const armX = st.npCol ? 1018 + Math.sin(t * 2.5) * 1.5 : 1054;
    const armY = st.npCol ? 438 : 444;
    c.strokeStyle = '#7d7d86'; c.lineWidth = 4; c.beginPath(); c.moveTo(1056, 402); c.lineTo(1050, 430); c.lineTo(armX, armY); c.stroke();
    if (st.cake) { // Nan Beryl's lemon drizzle on a plate
      c.fillStyle = '#fff'; c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath(); c.ellipse(1118, 452, 24, 8, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#f6d55c'; rr(c, 1102, 434, 32, 18, 4); c.fill(); c.stroke();
      c.fillStyle = '#fff9e6'; rr(c, 1102, 432, 32, 6, 3); c.fill();
    }
    // till
    c.fillStyle = '#3a3640'; rr(c, 1170, 382, 96, 78, 8); c.fill(); c.stroke();
    c.fillStyle = '#7ff7a4'; rr(c, 1180, 390, 76, 22, 3); c.fill();
    c.fillStyle = '#16121a'; c.font = '700 15px monospace'; c.textAlign = 'right'; c.fillText('£' + (st.cash | 0), 1252, 407); c.textAlign = 'center';
    c.fillStyle = '#c0c4cc'; for (let i = 0; i < 6; i++) { rr(c, 1182 + (i % 3) * 25, 420 + Math.floor(i / 3) * 16, 20, 11, 2); c.fill(); }
  }

  G.CRS_ART = { person, chungy, cat, shop, counter, post, sleeveCanvas, sleeveDataURL, vinyl, sparkle, rr, shade, CHUNGY };
})(typeof window !== 'undefined' ? window : globalThis);
