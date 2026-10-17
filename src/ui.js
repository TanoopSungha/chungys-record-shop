// Chungy's Record Shop: screens, the live shop floor and input.
(function () {
  'use strict';
  const D = window.CRS_DATA, E = window.CRS, A = window.CRS_ART, AU = window.CRS_AUDIO;
  const $ = s => document.querySelector(s);
  const stage = $('#stage'), cv = $('#scene'), c = cv.getContext('2d');
  const layer = $('#layer'), hud = $('#hud'), crate = $('#crate'), screen = $('#screen'), toasts = $('#toasts');
  const W = 1280, H = 720;
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const money = n => '£' + Math.round(n).toLocaleString('en-GB');
  const stars = r => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));

  // Canvas text needs the bundled fonts loaded before record sleeves are painted.
  if (document.fonts) { document.fonts.load('700 20px Fredoka'); document.fonts.load('20px "Luckiest Guy"'); }
  let S = null, mode = 'title', paused = false, closing = false;
  let t = 0, last = performance.now(), ang = 0, beat = 0, bell = 0;
  const actors = new Map();
  const parts = [];
  let chungy = { face: 'happy', arm: 'idle', until: 0 };
  let cat = { x: 560, tx: 560, wait: 2, flip: false, sleep: false };
  let filter = 'all', crateSig = '', bubbleSig = '', tipsShown = {}, tipTimer = 0;
  let reaction = null; // { cid, text, until }

  // ---------- fit the 1280x720 board to the window ----------
  function fit() { const s = Math.min(innerWidth / W, innerHeight / H); stage.style.transform = `scale(${s})`; }
  addEventListener('resize', fit); fit();

  // ---------- small helpers ----------
  const urlCache = new Map();
  function sleeveURL(rec) { if (!urlCache.has(rec.id)) urlCache.set(rec.id, A.sleeveCanvas(rec, 160).toDataURL()); return urlCache.get(rec.id); }
  function toast(html, cls) { const d = document.createElement('div'); d.className = 'toast ' + (cls || ''); d.innerHTML = html; toasts.appendChild(d); setTimeout(() => d.remove(), 3500); while (toasts.children.length > 4) toasts.firstChild.remove(); }
  function float(x, y, text, cls) { const d = document.createElement('div'); d.className = 'float ' + (cls || ''); d.style.left = x + 'px'; d.style.top = y + 'px'; d.textContent = text; layer.appendChild(d); setTimeout(() => d.remove(), 1500); }
  function flash() { const d = document.createElement('div'); d.className = 'flash'; stage.appendChild(d); setTimeout(() => d.remove(), 800); }
  function say(face, arm, secs) { chungy = { face, arm, until: t + (secs || 1.6) }; }
  function portrait(look, w, h, face, isChungy) {
    const p = document.createElement('canvas'); p.width = w * 2; p.height = h * 2; const pc = p.getContext('2d');
    pc.scale(2, 2);
    if (isChungy) A.chungy(pc, w / 2, h - 6, h / 300, { face: face || 'happy', t: 0 });
    else A.person(pc, look, w / 2, h - 6, h / 270, { face: face || 'happy', t: 0 });
    return p;
  }
  function genreTag(g) { return `<span class="g" style="background:${D.GENRES[g].col}">${D.GENRES[g].name}</span>`; }

  // ---------- intro: the same Snoopster video as the other games ----------
  let introDone = null, introTimer = null;
  function endIntro() {
    clearTimeout(introTimer);
    document.removeEventListener('keydown', endIntro, true); document.removeEventListener('pointerdown', endIntro, true);
    const el = $('#intro .intro'); if (el) { el.classList.add('fadeout'); const v = el.querySelector('video'); if (v) v.pause(); setTimeout(() => { $('#intro').innerHTML = ''; }, 450); }
    if (introDone) { const f = introDone; introDone = null; f(); }
  }
  function playIntro(done) {
    introDone = done;
    $('#intro').innerHTML = '<div class="intro"><video src="assets/intro.mp4" autoplay playsinline></video><div class="skip">Press any key or tap to skip</div></div>';
    const v = $('#intro video');
    v.addEventListener('ended', endIntro); v.addEventListener('error', endIntro);
    const p = v.play(); if (p && p.catch) p.catch(() => { v.muted = true; v.play().catch(endIntro); });
    setTimeout(() => { document.addEventListener('keydown', endIntro, true); document.addEventListener('pointerdown', endIntro, true); }, 300);
    introTimer = setTimeout(endIntro, 15000);
  }

  // ---------- title ----------
  function showTitle() {
    mode = 'title'; hud.innerHTML = ''; crate.innerHTML = ''; layer.innerHTML = ''; actors.clear();
    const saved = E.load();
    screen.innerHTML = `<div class="panel">
      <div class="logo"><div class="t1">CHUNGY'S</div><div class="t2">RECORD SHOP</div><div class="sub">Dig the crates. Read the customers. Save the shop.</div></div>
      <div class="row" style="margin-top:14px">
        ${saved ? `<button class="green" data-a="continue">Continue: day ${saved.day}</button>` : ''}
        <button data-a="new">${saved ? 'New shop' : 'Open the shop'}</button>
        <button class="ghost" data-a="how">How to play</button>
      </div>
      <div class="credit">Developed by <b>Snoopster Gaming</b> · <a href="#" data-a="intro">Replay intro</a></div>
    </div>`;
  }

  function showHow() {
    screen.innerHTML = `<div class="panel"><div class="card howto">
      <h2>How to run Chungy's</h2>
      <ul>
        <li><b>Mornings:</b> buy a crate of records. Flip them over: some are rare, a few are legendary.</li>
        <li><b>Daytime:</b> customers come to the counter and say what they're after. Tap the record in your crate (bottom of the screen) that fits best. Genre matters most, then the mood, then the decade.</li>
        <li><b>Read people:</b> punks look like punks, jazz cats wear berets. Their clothes give the genre away.</li>
        <li><b>Combos:</b> perfect matches in a row build a combo, and the tips grow with it.</li>
        <li><b>The turntable:</b> tap ▶ on a record to play it in the shop. Fans of that sound turn up more, wait longer and tip better.</li>
        <li><b>Regulars:</b> Nan Beryl, DJ Kwesi, Gemma and friends come back. Fill their five hearts and they give you a permanent perk.</li>
        <li><b>Sellers and thieves:</b> people sell you records over the counter. Hooded types try to nick stuff: tap them!</li>
        <li><b>Sundays:</b> the landlord, Mr Grimsby, wants his rent. Miss it twice and the shop closes.</li>
      </ul>
      <div class="row"><button data-a="back">Got it</button></div></div></div>`;
  }

  // ---------- morning ----------
  function showMorning() {
    mode = 'morning'; closing = false; actors.clear(); layer.innerHTML = ''; crate.innerHTML = '';
    E.save(S);
    buildHud();
    const wd = E.weekday(S), rentIn = 6 - wd;
    const guide = E.hasPerk(S, 'guide');
    const lots = S.lots.map(l => {
      const can = S.cash >= l.cost;
      const hint = guide ? E.lotHint(S, l) : null;
      return `<div class="card lot ${can ? '' : 'cant'}" data-lot="${l.id}">
        ${l.mystery ? '<div class="tag">MYSTERY</div>' : l.luck >= 1.8 ? '<div class="tag">GOOD STUFF</div>' : ''}
        <div class="crateart" data-art="${l.id}"></div>
        <h3>${esc(l.name)}</h3><p>${esc(l.blurb)}</p>
        <div class="meta"><span>${l.n} records · luck ${'♦'.repeat(Math.min(5, Math.round(l.luck * 1.6)))}</span><span class="cost">${money(l.cost)}</span></div>
        ${hint ? `<div style="font-size:13px;color:#2f6f5e">📖 The Professor reckons it's worth about ${money(hint.value)}. Best in it: a ${D.RARITY[hint.best.rarity].name} ${D.GENRES[hint.best.genre].name} record.</div>` : ''}
      </div>`;
    }).join('');
    screen.innerHTML = `<div class="panel">
      <div class="head"><h2>${D.DAYS[wd]} morning</h2><p>Day ${S.day} · Week ${E.week(S)} · Rent of ${money(D.rentFor(E.week(S)))} due ${rentIn === 0 ? '<b>tonight</b>' : `in ${rentIn} day${rentIn > 1 ? 's' : ''}`}</p></div>
      ${S.event ? `<div class="card" style="padding:8px 16px;background:#b6f2e7"><b>${esc(S.event.name)}:</b> ${esc(S.event.desc)}</div>` : ''}
      <div class="goalsbox">${S.goals.map(g => `<div>🎯 ${esc(g.text)} <b>+${money(g.reward)}</b></div>`).join('')}</div>
      <div class="lots">${lots}</div>
      <div class="row"><span style="color:var(--cream)">Rack: ${S.stock.length}/${E.stockCap(S)} records</span><button class="ghost" data-a="skipdig">Skip digging, open up</button></div>
    </div>`;
    // little crate illustrations
    for (const el of screen.querySelectorAll('[data-art]')) {
      const lot = S.lots.find(l => l.id === el.dataset.art);
      const cc = document.createElement('canvas'); cc.width = 294; cc.height = 110; el.appendChild(cc);
      const x = cc.getContext('2d');
      x.fillStyle = lot.mystery ? '#3b2a4a' : '#c98b3c'; x.fillRect(0, 0, 294, 110);
      const recs = (lot.items || []).slice(0, 7);
      recs.forEach((it, i) => { const rec = D.BY_ID[it.id]; x.save(); x.translate(40 + i * 32, 20); x.rotate(-0.2 + i * 0.05); if (lot.mystery) { x.fillStyle = '#5b4a6a'; x.fillRect(0, 0, 70, 70); x.fillStyle = '#ffd34d'; x.font = '900 40px sans-serif'; x.fillText('?', 22, 50); } else x.drawImage(A.sleeveCanvas(rec, 160), 0, 0, 70, 70); x.restore(); });
      x.fillStyle = '#8a5530'; x.fillRect(10, 70, 274, 40); x.strokeStyle = '#2a1a24'; x.lineWidth = 3; x.strokeRect(10, 70, 274, 40);
      if (lot.mystery) { x.fillStyle = '#d9c38a'; x.fillRect(10, 80, 274, 12); }
    }
  }

  // ---------- dig: flip the records ----------
  function showDig(dig) {
    mode = 'dig';
    E.save(S);
    const cards = dig.items.map((it, i) => {
      const rec = D.BY_ID[it.id];
      return `<div class="flip r-${rec.rarity}" data-i="${i}"><div class="burst"></div><div class="in"><div class="f">?</div>
        <div class="b">${it.isNew ? '<div class="new">NEW</div>' : ''}<img src="${sleeveURL(rec)}" alt="">
        <div class="m"><b>${esc(rec.title)}</b><br>${esc(rec.artist)}<br>${genreTag(rec.genre)} ${rec.era} · ${it.grade}</div>
        <div class="rar" style="color:${D.RARITY[rec.rarity].col};-webkit-text-stroke:.6px #2a1a24">${D.RARITY[rec.rarity].name} · ${money(E.valueOf(it))}</div></div></div></div>`;
    }).join('');
    screen.innerHTML = `<div class="panel">
      <div class="head"><h2>Crate digging</h2><p>Tap each record to flip it over.</p></div>
      <div class="dig">${cards}</div>
      ${dig.overflow ? `<div class="card" style="padding:6px 14px">Rack full! Dave took ${dig.overflow} record${dig.overflow > 1 ? 's' : ''} off your hands for ${money(dig.resold)}. (They still count in your Crate Book.)</div>` : ''}
      <div class="row"><button class="ghost" data-a="flipall">Flip them all</button><button class="green" data-a="open" id="openBtn" style="display:none">Open the shop!</button></div>
    </div>`;
  }
  function flipCard(el) {
    if (el.classList.contains('open')) return;
    el.classList.add('open');
    const rec = D.BY_ID[S.lastDig.items[+el.dataset.i].id];
    if (rec.rarity === 'L') { AU.sfx('legend'); flash(); toast(`<b>LEGENDARY!</b> ${esc(rec.title)} by ${esc(rec.artist)}`, 'gold'); }
    else if (rec.rarity === 'R') AU.sfx('rare'); else AU.sfx('flip');
    if (screen.querySelectorAll('.flip:not(.open)').length === 0) $('#openBtn').style.display = '';
  }

  // ---------- the shop day ----------
  function openShop() {
    E.openShop(S); AU.duck(false); paused = false;
    mode = 'shop'; closing = false; screen.innerHTML = ''; layer.innerHTML = ''; actors.clear(); crateSig = ''; bubbleSig = '';
    buildHud();
    if (S.event) toast(`<b>${esc(S.event.name)}</b><br>${esc(S.event.desc)}`, 'teal');
    const np = S.nowPlaying && S.stock.find(x => x.uid === S.nowPlaying);
    if (np) AU.play(E.recOf(np));
    if (S.day === 1) tip('open', 'Morning! When someone comes to the counter, read what they want, then tap the right record in the crate below.');
    if (S.day === 2) tip('play', 'Tip: tap ▶ on a record to play it on the shop turntable. Fans of that sound come in more and wait longer.');
    if (S.day === 3 && E.wallSlots(S) === 0) tip('wall', 'Rent goes up every week. Spend your evenings on upgrades: they pay for themselves.');
  }

  function tip(id, text, secs) {
    if (tipsShown[id]) return; tipsShown[id] = true;
    const old = layer.querySelector('.bubble.chungy'); if (old) old.remove();
    const d = document.createElement('div'); d.className = 'bubble chungy'; d.style.left = '1090px'; d.style.top = '226px'; d.innerHTML = `<div class="who">Chungy</div>${esc(text)}`;
    layer.appendChild(d); say('talk', 'wave', 2.2);
    clearTimeout(tipTimer); tipTimer = setTimeout(() => d.remove(), (secs || 7) * 1000);
  }

  // positions on the shop floor
  const DOOR = { x: 330, y: 552 };
  const BROWSE = [470, 560, 650, 740, 520, 690];
  const QUEUE = [850, 752, 654, 556, 458, 380];
  function actorFor(cu) {
    let a = actors.get(cu.cid);
    if (!a) { a = { x: DOOR.x, y: DOOR.y - 6, tx: DOOR.x + 60, ty: 530, walk: 0, alpha: 0, spot: -1, blink: 0, hold: null, cheer: 0 }; actors.set(cu.cid, a); }
    return a;
  }
  function placeActors() {
    const T = S.today; if (!T) return;
    const usedSpots = new Set();
    for (const cu of T.cust) { const a = actors.get(cu.cid); if (a && a.spot >= 0 && cu.state === 'browse') usedSpots.add(a.spot); }
    for (const cu of T.cust) {
      const a = actorFor(cu);
      if (cu.state === 'enter') { a.tx = DOOR.x + 80; a.ty = 532; }
      else if (cu.state === 'browse') {
        if (a.spot < 0) { a.spot = BROWSE.findIndex((_, i) => !usedSpots.has(i)); if (a.spot < 0) a.spot = 0; usedSpots.add(a.spot); }
        a.tx = BROWSE[a.spot]; a.ty = 524 + (a.spot % 2) * 6;
      } else if (cu.state === 'queue' || cu.state === 'haggle') {
        const qi = Math.max(0, T.queue.indexOf(cu.cid)); a.tx = QUEUE[Math.min(qi, QUEUE.length - 1)]; a.ty = 556;
      } else if (cu.state === 'sneak') { a.tx = DOOR.x + 10; a.ty = 548; a.sneak = true; }
      else if (cu.state === 'leaving') { a.tx = DOOR.x; a.ty = DOOR.y - 6; a.leaving = true; }
    }
    // drop actors that are gone
    for (const [cid, a] of actors) if (!T.cust.some(cu => cu.cid === cid) && (a.alpha <= 0.01 || !a.leaving)) actors.delete(cid);
  }

  function updateActors(dt) {
    for (const [cid, a] of actors) {
      const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
      const sp = a.sneak ? 70 : 150;
      if (d > 2) { const k = Math.min(1, sp * dt / d); a.x += dx * k; a.y += dy * k; a.walk = (a.walk || 0) + dt * 9; a.moving = true; a.flip = dx < 0; }
      else { a.moving = false; a.flip = false; }
      if (a.leaving && d < 30) a.alpha = Math.max(0, a.alpha - dt * 2.5); else a.alpha = Math.min(1, a.alpha + dt * 3);
      a.blink -= dt; if (a.blink < -3 - (cid % 3)) a.blink = 0.12;
      if (a.cheer > 0) a.cheer -= dt;
    }
  }

  function handle(evs) {
    for (const e of evs) {
      switch (e.t) {
        case 'enter': bell = 1; AU.sfx('bell'); if (e.kind === 'regular') { const R = D.REGULARS.find(r => r.id === e.reg); toast(`<b>${esc(R.name)}</b> just walked in!`, 'pink'); } break;
        case 'queue': if (S.day === 1 && S.stats.served === 0) setTimeout(() => tip('first', 'Look at how they dress too: it gives away their taste. Tap a record below to hand it over. A glowing record is a perfect fit.'), 600); break;
        case 'thief': AU.sfx('alarm'); toast('<b>Shoplifter!</b> Tap the hooded figure before they reach the door!', 'red'); break;
        case 'stolen': { const R = D.BY_ID[e.rec]; toast(`Gutted. They got away with <b>${esc(R.title)}</b>.`, 'red'); say('cross', 'idle', 2); break; }
        case 'caught': { const a = actors.get(e.cid); if (a) float(a.x, a.y - 240, e.auto ? 'Big Terry got him!' : 'Gotcha!', 'green'); AU.sfx('pop'); toast(e.auto ? 'Big Terry blocked the door. Nobody nicks from Chungy\'s.' : 'You caught the shoplifter! The record\'s back on the rack.', 'teal'); break; }
        case 'leave': break;
        case 'comboLost': if (e.n >= 2) float(980, 300, `Combo lost (${e.n}x)`, 'red'); break;
        case 'goal': AU.sfx('cash'); toast(`🎯 Goal done: <b>${esc(e.text)}</b> +${money(e.reward)}`, 'gold'); break;
        case 'level': AU.sfx('level'); flash(); toast(`<b>LEVEL ${e.level}!</b>${e.genres.length ? `<br>New genre: <b>${e.genres.join(', ')}</b>` : ''}${e.regs.length ? `<br>New regular: <b>${e.regs.join(', ')}</b>` : ''}`, 'gold'); break;
        case 'perk': showPerk(e); break;
      }
    }
  }

  function showPerk(e) {
    paused = true;
    const R = D.REGULARS.find(r => r.id === e.reg);
    AU.sfx('legend'); flash();
    const p = document.createElement('div'); p.className = 'panel';
    p.innerHTML = `<div class="card" style="display:flex;gap:18px;align-items:center;max-width:620px"><div id="perkPic"></div><div><h2>${esc(R.name)} ♥♥♥♥♥</h2><p>${esc(R.lines[4])}</p><p><b>New perk: ${esc(e.perk.name)}</b><br>${esc(e.perk.desc)}</p><button data-a="unpause">Brilliant!</button></div></div>`;
    screen.appendChild(p);
    p.querySelector('#perkPic').appendChild(portrait(R.look, 150, 200, 'joy'));
  }

  // ---------- serving ----------
  function tapRecord(uid) {
    if (mode !== 'shop') return;
    AU.init();
    const cu = E.front(S);
    if (!cu || cu.state !== 'queue' || cu.kind === 'seller' || cu.kind === 'thief') { playRecord(uid); return; }
    const a = actors.get(cu.cid);
    const r = E.offer(S, uid);
    handle(r.ev);
    if (r.ok && r.haggle) { AU.sfx('pop'); AU.speak("That's the one! I've been after this for years.", { who: cu.reg, seed: cu.look.seed, mood: 'wow' }); say('wow', 'idle'); bubbleSig = ''; return; }
    if (r.ok) saleDone(r, a, cu);
    else if (r.say) { AU.sfx('fail'); AU.speak(r.say, { who: cu.reg, seed: cu.look.seed, mood: 'meh' }); reaction = { cid: cu.cid, text: r.say, until: t + 2.6 }; bubbleSig = ''; say('meh', 'idle'); if (a && r.gone) float(a.x, a.y - 250, '✗', 'red'); }
    crateSig = '';
  }

  function saleDone(r, a, cu) {
    AU.sfx('till');
    const x = a ? a.x : 850, y = a ? a.y - 250 : 300;
    float(x, y, '+' + money(r.price), 'green');
    if (r.tip) setTimeout(() => float(x + 40, y + 30, 'tip ' + money(r.tip), ''), 250);
    if (r.perfect) {
      if (r.combo >= 2) { AU.sfx('combo', r.combo); float(980, 260, `COMBO ${r.combo}x`, 'big'); }
      else float(x, y - 40, 'PERFECT!', 'pink');
      say('joy', r.combo >= 3 ? 'cheer' : 'wave', 1.6);
    } else say('happy', 'idle');
    if (a) { a.hold = D.GENRES[r.rec.genre].col; a.cheer = r.perfect ? 1.4 : 0; }
    for (let i = 0; i < 6; i++) parts.push({ x: x, y: y + 60, vx: (1210 - x) / 0.9 + (Math.random() - 0.5) * 80, vy: -320 - Math.random() * 120, g: 600, life: 0.9, kind: 'coin' });
    if (r.hearts) { AU.sfx('heart'); AU.speak(r.regLine, { who: cu.reg, seed: cu.look.seed, mood: 'joy' }); reaction = { cid: cu.cid, text: r.regLine, until: t + 4.5, keep: true }; for (let i = 0; i < 5; i++) parts.push({ x: x + (Math.random() - 0.5) * 60, y: y + 40, vx: (Math.random() - 0.5) * 40, vy: -90, g: 0, life: 1.6, kind: 'heart' }); }
    else if (cu && r.perfect) { AU.speak('Brilliant! Cheers Chungy!', { who: cu.reg, seed: cu.look.seed, mood: 'joy' }); }
    if (S.day === 1 && S.stats.served === 1) setTimeout(() => tip('combo', 'Lovely! Perfect matches in a row build a combo, and the tips grow with it.'), 900);
    if (r.rec.rarity === 'L') { flash(); toast(`You sold a <b>legendary</b> record for ${money(r.price + r.tip)}!`, 'gold'); }
  }

  function playRecord(uid) {
    const it = S.stock.find(x => x.uid === uid); if (!it) return;
    E.setPlaying(S, uid); AU.play(E.recOf(it)); crateSig = '';
    float(984, 360, '♫ ' + D.GENRES[E.recOf(it).genre].name, 'pink');
  }

  function cycleTurntable() {
    if (!S || !S.stock.length) return;
    const ix = S.stock.findIndex(x => x.uid === S.nowPlaying);
    const next = S.stock[(ix + 1) % S.stock.length];
    if (next) playRecord(next.uid);
  }

  // ---------- HUD ----------
  let hudEls = null;
  function buildHud() {
    hud.innerHTML = `<div class="bar">
      <div class="chip clock"><span id="hClock"></span></div>
      <div class="chip cash">💷 <span id="hCash"></span></div>
      <div class="chip"><span class="stars" id="hStars"></span></div>
      <div class="chip">Lv <span id="hLv"></span><div class="xp"><i id="hXp"></i></div></div>
      <div class="chip combo" id="hCombo" style="display:none"></div>
      <div class="sp"></div>
      ${mode === 'shop' ? '<button class="small ghost" data-a="pause" id="hPause">⏸ Pause</button>' : ''}
      <button class="small ghost" data-a="mute" id="hMute">${AU.muted ? '🔇' : '🔊'}</button>
    </div>
    ${mode === 'shop' ? `<div class="goals" id="hGoals"></div><div class="np" id="hNp" data-a="turntable" title="Click to spin the next record in your crate"></div>` : ''}`;
    hudEls = { clock: $('#hClock'), cash: $('#hCash'), stars: $('#hStars'), lv: $('#hLv'), xp: $('#hXp'), combo: $('#hCombo'), goals: $('#hGoals'), np: $('#hNp') };
  }
  let goalsSig = '';
  function updateHud() {
    if (!S || !hudEls) return;
    const T = S.today;
    const day = D.DAYS[E.weekday(S)].slice(0, 3);
    if (T) { const mins = Math.min(480, Math.floor(T.t / E.DAY_LEN * 480)); const hh = 10 + Math.floor(mins / 60), mm = mins % 60; hudEls.clock.textContent = `${day} ${String(hh).padStart(2, '0')}:${String(mm - mm % 5).padStart(2, '0')} ${T.t >= E.DAY_LEN ? '· Closed' : T.t > E.DAY_LEN - 15 ? '· Closing soon' : ''}`; }
    else hudEls.clock.textContent = `${day} · Day ${S.day} · Week ${E.week(S)}`;
    hudEls.cash.textContent = money(S.cash);
    hudEls.stars.textContent = stars(E.rating(S));
    hudEls.lv.textContent = S.level;
    hudEls.xp.style.width = Math.round(S.xp / E.xpFor(S.level) * 100) + '%';
    if (T && T.combo >= 2) { hudEls.combo.style.display = ''; hudEls.combo.textContent = `🔥 ${T.combo}x combo`; } else hudEls.combo.style.display = 'none';
    if (hudEls.goals) { const sig = JSON.stringify(S.goals.map(g => [g.have, g.done])); if (sig !== goalsSig) { goalsSig = sig; hudEls.goals.innerHTML = '<b>Today\'s goals</b>' + S.goals.map(g => `<div class="${g.done ? 'done' : ''}"><span>${esc(g.text)}</span><span>${g.done ? '✓' : g.id === 'earn' ? money(g.have) : g.have + '/' + g.n}</span></div>`).join(''); } }
    if (hudEls.np) {
      const np = S.nowPlaying && S.stock.find(x => x.uid === S.nowPlaying);
      if (np) {
        const rec = E.recOf(np), gCol = D.GENRES[rec.genre].col;
        const bars = Array.from({ length: 8 }, (_, k) => {
          const h = Math.round(25 + 75 * Math.abs(Math.sin(t * 7.5 + k * 0.85)) * (0.55 + beat * 0.45));
          return `<i style="height:${h}%;background:${k % 2 ? gCol : 'var(--teal)'}"></i>`;
        }).join('');
        hudEls.np.innerHTML = `<div class="np-wrap"><div class="np-disc" style="--gc:${gCol}"><span></span></div><div class="np-info"><b>${esc(rec.title)}</b> <small>(${D.GENRES[rec.genre].name})</small><br>${esc(rec.artist)} · <span class="np-next">↻ next</span></div><div class="np-eq">${bars}</div></div>`;
      } else {
        hudEls.np.innerHTML = 'Turntable empty: tap ▶ on a record';
      }
    }
  }

  // ---------- the crate (records for sale) ----------
  function renderCrate() {
    if (mode !== 'shop') { if (crate.innerHTML) crate.innerHTML = ''; return; }
    const cu = E.front(S);
    const hint = (S.day <= 2 || E.hasPerk(S, 'guide')) && cu && cu.state === 'queue' && cu.req;
    const sig = [S.stock.map(x => x.uid).join(','), S.nowPlaying, S.wall.join(','), filter, cu ? cu.cid + cu.state : '', hint ? 1 : 0].join('|');
    if (sig === crateSig) return; crateSig = sig;
    const gs = [...new Set(S.stock.map(x => E.recOf(x).genre))];
    const list = S.stock.filter(x => filter === 'all' || E.recOf(x).genre === filter)
      .sort((a, b) => E.recOf(a).genre.localeCompare(E.recOf(b).genre) || E.valueOf(b) - E.valueOf(a));
    const tiles = list.map((it, idx) => {
      const rec = E.recOf(it), framed = S.wall.includes(it.uid);
      const sc = cu && cu.state === 'queue' && cu.req && !framed ? E.matchScore(cu.req, rec) : 0;
      const good = hint && sc >= 0.99;
      return `<div class="tile r-${rec.rarity} ${S.nowPlaying === it.uid ? 'playing' : ''} ${framed ? 'framed' : ''} ${good ? 'hint' : ''}" data-uid="${it.uid}" title="${esc(rec.title)} by ${esc(rec.artist)} (${D.RARITY[rec.rarity].name}, ${it.grade})">
        <img src="${sleeveURL(rec)}" alt=""><div class="price">${money(E.valueOf(it))}</div>
        ${idx < 9 ? `<div class="kbd">${idx + 1}</div>` : ''}
        <div class="acts"><span data-play="${it.uid}" title="Play on the turntable">▶</span></div>
        <div class="meta">${genreTag(rec.genre)} <b>${rec.era}</b><br>${rec.moods.map(m => `<span class="mood">${m}</span>`).join('')}</div></div>`;
    }).join('') || '<div class="tile empty">No records!<br>Dig some up<br>tomorrow.</div>';
    crate.innerHTML = `<div class="drawer"><div class="tabs"><span class="lbl">Your crate</span>
      <button class="${filter === 'all' ? 'on' : ''}" data-f="all">All</button>
      ${gs.map(g => `<button class="${filter === g ? 'on' : ''}" data-f="${g}" style="border-color:${D.GENRES[g].col}">${D.GENRES[g].name}</button>`).join('')}
      <span class="cap">Keys 1–9 offer · T next tune · ${S.stock.length}/${E.stockCap(S)} records</span></div>
      <div class="row">${tiles}</div></div>`;
  }

  // ---------- speech bubbles ----------
  let lastSpokenBubble = '';
  function renderBubbles() {
    if (mode !== 'shop' || !S.today) return;
    const cu = E.front(S);
    let sig = cu ? cu.cid + cu.state + (cu.haggle ? cu.haggle.price : '') : '';
    if (reaction && reaction.until > t) sig += reaction.text; else reaction = null;
    // thieves
    for (const x of S.today.cust) if (x.kind === 'thief' && x.state === 'sneak') sig += 'T' + x.cid;
    if (sig !== bubbleSig) {
      bubbleSig = sig;
      layer.querySelectorAll('.bubble:not(.chungy), .thief').forEach(n => n.remove());
      if (cu && (cu.state === 'queue' || cu.state === 'haggle')) {
        layer.appendChild(bubbleFor(cu));
        const spkKey = cu.cid + ':' + cu.state;
        if (spkKey !== lastSpokenBubble && cu.state === 'queue' && (!reaction || reaction.cid !== cu.cid)) {
          lastSpokenBubble = spkKey;
          AU.speak(cu.text, { who: cu.reg, seed: cu.look.seed, mood: cu.face });
        }
      }
      for (const x of S.today.cust) if (x.kind === 'thief' && x.state === 'sneak') { const b = document.createElement('div'); b.className = 'thief'; b.dataset.thief = x.cid; b.textContent = '🚨 STOP THIEF!'; layer.appendChild(b); }
    }
    // keep bubbles over heads
    const b = layer.querySelector('.bubble:not(.chungy)');
    if (b && cu) { const a = actors.get(cu.cid); if (a) { b.style.left = Math.max(170, Math.min(1110, a.x)) + 'px'; b.style.top = (a.y - 238 * ((cu.look.h || 1) * 0.92 + 0.08)) + 'px'; } const p = b.querySelector('.pat i'); if (p) { const k = Math.max(0, cu.patience / cu.maxPat); p.style.width = k * 100 + '%'; p.classList.toggle('low', k < 0.3); } }
    layer.querySelectorAll('.thief').forEach(el => { const a = actors.get(+el.dataset.thief); if (a) { el.style.left = a.x + 'px'; el.style.top = (a.y - 250) + 'px'; } });
  }

  function cluePills(cu) {
    if (!cu.req) return '';
    const tags = [];
    if (cu.req.id) {
      const tgt = D.BY_ID[cu.req.id];
      if (tgt) tags.push(`<span class="ctag g" style="background:${D.GENRES[tgt.genre].col}">🎯 ${esc(tgt.genre.toUpperCase())}</span>`);
    } else {
      if (cu.req.genre) {
        const g = D.GENRES[cu.req.genre];
        tags.push(`<span class="ctag g" style="background:${g.col}">🎵 ${esc(g.name)}</span>`);
      } else if (cu.genre) {
        tags.push(`<span class="ctag" title="Look at their outfit!">👕 Looks like ${esc(D.GENRES[cu.genre].name)}?</span>`);
      }
      if (cu.req.mood) tags.push(`<span class="ctag">✨ ${esc(cu.req.mood)}</span>`);
      if (cu.req.era) tags.push(`<span class="ctag">📅 ${esc(cu.req.era)}</span>`);
    }
    return tags.length ? `<div class="clues">${tags.join('')}</div>` : '';
  }

  function bubbleFor(cu) {
    const d = document.createElement('div'); d.className = 'bubble';
    const reg = cu.kind === 'regular' ? S.regs[cu.reg] : null;
    const who = `<div class="who"><span>${esc(cu.name)}${cu.kind === 'collector' ? ' · collector' : cu.kind === 'seller' ? ' · selling' : ''}${cu.vibe ? ' · ♫ loves this tune' : ''}</span>${reg ? `<span class="hearts">${'♥'.repeat(reg.hearts)}${'♡'.repeat(5 - reg.hearts)}</span>` : ''}</div>`;
    const rx = reaction && reaction.cid === cu.cid ? `<div style="font-style:italic;color:#7a3c5c;margin-bottom:4px">"${esc(reaction.text)}"</div>` : '';
    if (cu.kind === 'seller') {
      const rec = D.BY_ID[cu.offer.id], guide = E.hasPerk(S, 'guide');
      const val = E.valueOf(cu.offer);
      d.innerHTML = `${who}${esc(cu.text)}<div class="offer"><img src="${sleeveURL(rec)}" alt=""><div><b>${esc(rec.title)}</b><br>${esc(rec.artist)}<br>${genreTag(rec.genre)} ${rec.era} · ${cu.offer.grade}<br><span style="color:${D.RARITY[rec.rarity].col};font-weight:700">${D.RARITY[rec.rarity].name}</span>${guide ? ` · worth ${money(val)}` : ''}${!S.found[rec.id] ? ' · <b style="color:var(--pink)">NEW</b>' : ''}</div></div>
        <div class="btns"><button class="small green" data-a="buyin">Buy for ${money(cu.ask)}</button><button class="small ghost" data-a="away">No thanks</button></div><div class="pat"><i></i></div>`;
    } else if (cu.state === 'haggle') {
      d.innerHTML = `${who}${rx || '"That\'s the one! I\'ve been after this for years."'}<div style="margin-top:6px">They'll pay <b>${money(cu.haggle.price)}</b>${cu.haggle.tip ? ` + ${money(cu.haggle.tip)} tip` : ''}.</div>
        <div class="btns"><button class="small green" data-a="deal">Deal!</button><button class="small pink" data-a="push">Push for more (risky)</button></div>`;
    } else {
      d.innerHTML = `${who}${rx}${esc(cu.text)}${cluePills(cu)}<div class="btns"><button class="small ghost" data-a="away">Sorry, haven't got one</button></div><div class="pat"><i></i></div>`;
    }
    return d;
  }

  // ---------- drawing ----------
  function draw() {
    c.clearRect(0, 0, W, H);
    const T = S && S.today;
    const np = S && S.nowPlaying && S.stock.find(x => x.uid === S.nowPlaying);
    const forSale = S ? S.stock.filter(x => !S.wall.includes(x.uid)).map(E.recOf) : [];
    const shelfRecs = forSale.length ? forSale : D.CATALOGUE.filter((_, i) => i % 7 === 0);
    const wallRecs = S ? S.wall.map(uid => S.stock.find(x => x.uid === uid)).filter(Boolean).map(E.recOf) : [];
    const st = {
      t, clock: T ? T.t / E.DAY_LEN : mode === 'evening' ? 0.95 : 0.1, up: S ? S.up : { rack: 1 }, open: mode === 'shop' && T && T.t < E.DAY_LEN,
      rain: S && S.event && S.event.id === 'rain', bell, beat, shelfRecs, binRecs: shelfRecs,
      wallRecs, wallSlots: S ? E.wallSlots(S) : 0, pipSign: S && E.hasPerk(S, 'sign'),
      windowRec: S && S.windowId ? D.BY_ID[S.windowId] : null,
    };
    A.shop(c, W, H, st);
    // Chungy behind the counter
    const cf = chungy.until > t ? chungy.face : (T && E.front(S) ? 'neutral' : 'happy');
    const ca = chungy.until > t ? chungy.arm : 'idle';
    if (mode !== 'title') A.chungy(c, 1090, 556, 1.02, { face: cf === 'talk' ? 'talk' : cf, arm: ca, t, blink: (t % 4) < 0.12, groove: AU.playing() ? beat : 0 });
    A.counter(c, { t, ang, npCol: np ? D.GENRES[E.recOf(np).genre].col : null, cash: S ? S.cash : 0, cake: S && E.hasPerk(S, 'cake') });
    if (np) { // floating notes from the turntable
      if (Math.random() < 0.065) parts.push({ x: 984 + (Math.random() - 0.5) * 40, y: 400, vx: (Math.random() - 0.5) * 30, vy: -60, g: 0, life: 2, kind: 'note', col: D.GENRES[E.recOf(np).genre].col });
    }
    // people, back to front
    if (T) {
      const list = T.cust.map(cu => ({ cu, a: actors.get(cu.cid) })).filter(o => o.a).sort((p, q) => p.a.y - q.a.y);
      for (const { cu, a } of list) {
        c.globalAlpha = a.alpha;
        let face = cu.face, arm = 'idle';
        if (cu.state === 'browse') { const ph = (t + cu.cid * 1.7) % 6; arm = a.moving ? 'idle' : ph < 3.5 ? 'dig' : ph < 4.6 ? 'think' : 'idle'; face = ph < 3.5 ? 'neutral' : 'happy'; }
        if (E.front(S) === cu && cu.state === 'queue' && cu.st < 1.5) face = 'talk';
        if (cu.state === 'haggle') { face = 'wow'; arm = 'idle'; }
        if (a.hold) arm = 'hold';
        if (a.cheer > 0) { arm = 'cheer'; face = 'joy'; }
        if (cu.kind === 'thief' && cu.state === 'sneak') { arm = 'hold'; a.hold = '#c3001b'; }
        if (cu.caught) { arm = 'idle'; face = 'cross'; }
        const groove = cu.vibe && !a.moving && (cu.state === 'browse' || cu.state === 'queue') ? beat : 0;
        if (cu.vibe && !a.moving && Math.random() < 0.025 && np) {
          parts.push({ x: a.x + (Math.random() - 0.5) * 24, y: a.y - 210, vx: (Math.random() - 0.5) * 18, vy: -45, g: 0, life: 1.4, kind: 'note', col: D.GENRES[E.recOf(np).genre].col });
        }
        A.person(c, cu.look, a.x, a.y, 0.95, { walk: a.moving ? a.walk : null, face, arm, holdCol: a.hold, flip: a.flip, t, blink: a.blink > 0, groove });
        c.globalAlpha = 1;
      }
    }
    // the shop cat
    if (S && S.up.cat) A.cat(c, cat.x, 556, 0.9, t, cat.flip, cat.sleep);
    // particles
    for (const p of parts) {
      c.globalAlpha = Math.min(1, p.life * 2);
      if (p.kind === 'coin') { c.fillStyle = '#ffd34d'; c.strokeStyle = '#2a1a24'; c.lineWidth = 2; c.beginPath(); c.ellipse(p.x, p.y, 7, 7 * Math.abs(Math.cos(p.life * 12)), 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
      else if (p.kind === 'heart') { c.fillStyle = '#ff5fa2'; c.font = '26px sans-serif'; c.fillText('♥', p.x, p.y); }
      else if (p.kind === 'note') { c.fillStyle = p.col; c.strokeStyle = '#2a1a24'; c.lineWidth = 3; c.font = '900 26px sans-serif'; c.strokeText('♪', p.x, p.y); c.fillText('♪', p.x, p.y); }
      c.globalAlpha = 1;
    }
    A.post(c, W, H, st);
    if (mode === 'title' || mode === 'over') {
      c.fillStyle = 'rgba(26,15,24,.35)'; c.fillRect(0, 0, W, H);
      // big Chungy waving hello on the title screen, with a record spinning behind him
      c.save(); c.globalCompositeOperation = 'lighter'; const sg = c.createRadialGradient(1080, 420, 20, 1080, 420, 330); sg.addColorStop(0, 'rgba(255,170,90,.45)'); sg.addColorStop(1, 'rgba(255,95,162,0)'); c.fillStyle = sg; c.fillRect(700, 60, 580, 660); c.restore();
      A.chungy(c, 1080, 760, 2.05, { face: (t % 5) < 0.15 ? 'happy' : 'joy', arm: 'wave', t, groove: beat });
      A.person(c, D.REGULARS[0].look, 170, 760, 1.55, { face: 'happy', arm: 'idle', t });
      A.cat(c, 330, 712, 1.3, t, false, false);
    }
  }

  function updateParts(dt) {
    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; p.life -= dt; }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
  }

  function updateCat(dt) {
    if (!S || !S.up.cat) return;
    cat.wait -= dt;
    if (cat.sleep) { if (cat.wait < 0) { cat.sleep = false; cat.wait = 3; } return; }
    const d = cat.tx - cat.x;
    if (Math.abs(d) > 2) { cat.x += Math.sign(d) * Math.min(Math.abs(d), 60 * dt); cat.flip = d < 0; }
    else if (cat.wait < 0) { if (Math.random() < 0.3) { cat.sleep = true; cat.wait = 8; } else { cat.tx = 420 + Math.random() * 420; cat.wait = 2 + Math.random() * 4; } }
    let hit = layer.querySelector('.hit.cat');
    if (!hit && mode === 'shop') { hit = document.createElement('div'); hit.className = 'hit cat'; hit.dataset.a = 'cat'; hit.title = 'Wax the cat'; layer.appendChild(hit); }
    if (hit) { hit.style.left = (cat.x - 45) + 'px'; hit.style.top = '490px'; hit.style.width = '90px'; hit.style.height = '66px'; }
  }

  // ---------- end of day, evening ----------
  let lastSum = null;
  function endDay() {
    AU.duck(true);
    lastSum = E.closeShop(S);
    // finish any completed Crate Book genre sets (one-off bonus)
    S.bookDone = S.bookDone || {};
    for (const g of D.GENRE_IDS) {
      if (S.bookDone[g]) continue;
      const all = D.CATALOGUE.filter(r => r.genre === g);
      if (all.every(r => S.found[r.id])) { S.bookDone[g] = true; S.cash += 150; lastSum.book = (lastSum.book || []).concat(D.GENRES[g].name); }
    }
    layer.innerHTML = ''; actors.clear(); crate.innerHTML = '';
    if (lastSum.rentDue) showGrimsby(); else showEvening('today');
  }

  const GRIMSBY = { skin: '#f0c9a8', hair: 'bald', hairCol: '#9a9a9a', top: 'suit', col: '#3a3a44', legs: '#2a2a30', acc: 'glasses', build: 1.25, h: 1.06, seed: 9, eyes: '#4e5d6c' };
  function showGrimsby() {
    mode = 'rent';
    const due = D.rentFor(E.week(S));
    const can = S.cash >= due;
    AU.speak(`Evening Chungy. That will be ${due} pounds for the week.`, { who: 'grimsby', mood: can ? 'neutral' : 'cross' });
    screen.innerHTML = `<div class="panel"><div class="card grimsby"><div id="grimPic"></div><div style="max-width:440px">
      <h2>Mr Grimsby, the landlord</h2>
      <p style="font-size:18px">"Evening, Chungy. Sunday again. That'll be <b>${money(due)}</b> for the week. Rent goes up next week, as always."</p>
      <p>You have <b>${money(S.cash)}</b>. ${S.strikes ? `<b style="color:var(--red)">You already missed a payment. Miss another and he takes the keys.</b>` : ''}</p>
      <div class="row" style="justify-content:flex-start"><button class="${can ? 'green' : 'red'}" data-a="payrent">${can ? 'Pay ' + money(due) : 'Pay what I can (' + money(S.cash) + ')'}</button></div>
    </div></div></div>`;
    $('#grimPic').appendChild(portrait(GRIMSBY, 220, 290, can ? 'neutral' : 'cross'));
  }

  function showEvening(tab) {
    mode = 'evening'; E.save(S);
    buildHud();
    const sum = lastSum || { takings: 0, served: 0, perfect: 0, rating: E.rating(S), goals: 0 };
    const tabs = [['today', 'Today'], ['ups', 'Upgrades'], ['book', 'Crate Book'], ['regs', 'Regulars'], ['wall', 'Wall & window']];
    let body = '';
    if (tab === 'today') {
      body = `<div class="stats">
        <div class="stat"><b>${money(sum.takings)}</b>taken today</div><div class="stat"><b>${sum.served}</b>records sold</div>
        <div class="stat"><b>${sum.perfect}</b>perfect matches</div><div class="stat"><b style="color:#e2a21b">${stars(sum.rating)}</b>shop rating</div></div>
        <div class="card" style="margin-top:12px;box-shadow:none;border-width:3px">
        <h3>Goals</h3>${S.goals.map(g => `<div>${g.done ? '✅' : '⬜'} ${esc(g.text)} ${g.done ? `(+${money(g.reward)})` : ''}</div>`).join('')}
        ${sum.coffee ? `<div style="margin-top:6px">☕ Coffee sales: ${money(sum.coffee)}</div>` : ''}
        ${sum.book ? `<div style="margin-top:6px">📖 Crate Book set complete: <b>${sum.book.join(', ')}</b>! +£150 each</div>` : ''}
        <div style="margin-top:8px">Best combo ever: <b>${S.stats.bestCombo}x</b> · Records sold in total: <b>${S.stats.sold}</b> · Crate Book: <b>${Object.keys(S.found).length}/${D.CATALOGUE.length}</b></div>
        <div style="margin-top:6px">Next rent: <b>${money(D.rentFor(E.week({ day: S.day + 1 })))}</b> on ${E.weekday(S) === 6 ? 'next' : 'this'} Sunday.</div></div>`;
    } else if (tab === 'ups') {
      body = `<div class="ups">${D.UPGRADES.map(u => {
        const lv = S.up[u.id], cost = E.upgradeCost(S, u.id);
        return `<div class="up"><h3>${u.icon} ${esc(u.name)}</h3><p>${esc(u.desc)}</p><div class="lv">Level ${lv}/${u.levels.length}</div>
          ${cost == null ? '<button class="small ghost" disabled>Maxed out</button>' : `<button class="small ${S.cash >= cost ? 'green' : ''}" data-up="${u.id}" ${S.cash >= cost ? '' : 'disabled'}>Buy for ${money(cost)}</button>`}</div>`;
      }).join('')}</div>`;
    } else if (tab === 'book') {
      const curPlay = AU.playing();
      body = '<p style="margin:0 0 6px;font-size:13px;color:#5b3b4b">Tap any discovered record to spin it on the jukebox! Complete all 14 in a genre for a <b>£150</b> bonus.</p><div class="book">' + D.GENRE_IDS.map(g => {
        const recs = D.CATALOGUE.filter(r => r.genre === g), have = recs.filter(r => S.found[r.id]).length;
        const locked = D.GENRES[g].unlock > S.level;
        return `<div class="hdr"><span>${genreTag(g)} ${D.GENRES[g].name}${locked ? ` (unlocks at level ${D.GENRES[g].unlock})` : ''}</span><span>${have}/${recs.length}${S.bookDone && S.bookDone[g] ? ' ✓' : ''}</span></div>` +
          recs.map(r => S.found[r.id] ? `<div class="slot found r-${r.rarity} ${curPlay && curPlay.id === r.id ? 'playing' : ''}" data-preview="${r.id}" title="Tap to play: ${esc(r.title)} by ${esc(r.artist)} (${D.RARITY[r.rarity].name})"><img src="${sleeveURL(r)}" alt=""></div>` : `<div class="slot r-${r.rarity}">${r.rarity === 'L' ? '★' : '?'}</div>`).join('');
      }).join('') + '</div>';
    } else if (tab === 'regs') {
      body = `<div class="regs">${D.REGULARS.map(R => { const st = S.regs[R.id], locked = R.unlock > S.level; return `<div class="reg ${locked ? 'locked' : ''}" data-reg="${R.id}" title="Click to hear ${esc(R.name)}"><div class="pic"></div><b>${esc(R.name)}</b><div>Loves ${R.likes.map(g => D.GENRES[g].name).join(' & ')}</div><div class="hearts">${'♥'.repeat(st.hearts)}${'♡'.repeat(5 - st.hearts)}</div>${locked ? `<div>Turns up at level ${R.unlock}</div>` : st.hearts >= 5 ? `<div class="perk">✨ ${esc(R.perk.name)}: ${esc(R.perk.desc)}</div>` : `<div style="color:#7a3c5c">Perk at 5 hearts: ${esc(R.perk.name)}</div>`}${st.hearts ? `<div style="font-style:italic;margin-top:4px">"${esc(R.lines[st.hearts - 1])}"</div>` : ''}</div>`; }).join('')}</div>`;
    } else if (tab === 'wall') {
      const slots = E.wallSlots(S);
      const list = S.stock.slice().sort((a, b) => E.valueOf(b) - E.valueOf(a));
      body = `<p>${slots ? `Frame up to <b>${slots}</b> records on the Wall of Fame. Framed records aren't for sale, but they boost your rating and pull in their fans.` : 'Buy <b>Wall of Fame frames</b> in Upgrades to show off your best finds.'}
        Pick one record for the <b>shop window</b> too: it draws in fans of that genre.</p>
        <div class="row" style="justify-content:flex-start;gap:8px">${list.map(it => { const rec = E.recOf(it), fr = S.wall.includes(it.uid), win = S.windowId === rec.id; return `<div class="tile r-${rec.rarity}" style="cursor:default"><img src="${sleeveURL(rec)}" alt=""><div class="price">${money(E.valueOf(it))}</div><div class="meta" style="display:flex;gap:3px;justify-content:center;padding-top:4px">
          ${slots ? `<button class="small ${fr ? 'pink' : 'ghost'}" style="font-size:11px;padding:1px 5px" data-frame="${it.uid}">${fr ? 'Framed' : 'Frame'}</button>` : ''}
          <button class="small ${win ? 'pink' : 'ghost'}" style="font-size:11px;padding:1px 5px" data-window="${it.uid}">${win ? 'In window' : 'Window'}</button></div></div>`; }).join('')}</div>`;
    }
    screen.innerHTML = `<div class="panel"><div class="card evening">
      <div class="row" style="justify-content:space-between"><h2>${D.DAYS[E.weekday(S)]} evening · Day ${S.day}</h2><div class="tabsrow">${tabs.map(([k, n]) => `<button class="small ${k === tab ? 'on' : 'ghost'}" data-tab="${k}">${n}</button>`).join('')}</div></div>
      <div class="body">${body}</div>
      <div class="row" style="justify-content:space-between"><span>💷 <b>${money(S.cash)}</b> · Level ${S.level} · ${stars(E.rating(S))}</span><span><button class="ghost small" data-a="menu">Save & quit</button> <button class="green" data-a="sleep">Lock up, next day →</button></span></div>
    </div></div>`;
    if (tab === 'regs') for (const el of screen.querySelectorAll('[data-reg]')) { const R = D.REGULARS.find(r => r.id === el.dataset.reg); el.querySelector('.pic').appendChild(portrait(R.look, 120, 140, S.regs[R.id].hearts >= 3 ? 'joy' : 'happy')); }
    eveningTab = tab;
  }
  let eveningTab = 'today';

  function showOver() {
    mode = 'over'; E.wipe();
    AU.stop();
    hud.innerHTML = ''; crate.innerHTML = '';
    screen.innerHTML = `<div class="panel"><div class="card over" style="text-align:center;max-width:620px">
      <h2>Shop closed</h2><p style="font-size:18px">Mr Grimsby changed the locks. Chungy's lasted <b>${S.day} days</b>.</p>
      <p>Records sold: <b>${S.stats.sold}</b> · Perfect matches: <b>${S.stats.perfect}</b> · Best combo: <b>${S.stats.bestCombo}x</b><br>Crate Book: <b>${Object.keys(S.found).length}/${D.CATALOGUE.length}</b> · Level <b>${S.level}</b></p>
      <p>Chungy's not done though. There's an empty unit on the next street...</p>
      <button class="green" data-a="new">Open a new shop</button></div></div>`;
  }

  // ---------- input ----------
  document.addEventListener('click', ev => {
    AU.init();
    const el = ev.target.closest('[data-a],[data-lot],[data-uid],[data-play],[data-preview],[data-reg],[data-f],[data-tab],[data-up],[data-frame],[data-window],[data-thief],.flip');
    if (!el) return;
    if (el.dataset.play) { ev.stopPropagation(); playRecord(+el.dataset.play); return; }
    if (el.dataset.preview) {
      const rec = D.BY_ID[el.dataset.preview];
      if (rec) { AU.duck(false); AU.play(rec); toast(`♫ Playing <b>${esc(rec.title)}</b> by ${esc(rec.artist)}`, 'pink'); showEvening('book'); }
      return;
    }
    if (el.dataset.reg && mode === 'evening') {
      const R = D.REGULARS.find(r => r.id === el.dataset.reg);
      if (R && R.unlock <= S.level) {
        const line = R.lines[Math.max(0, (S.regs[R.id].hearts || 1) - 1)];
        AU.speak(line, { who: R.id, mood: 'happy' });
        toast(`<b>${esc(R.name)}:</b> "${esc(line)}"`, 'pink');
      }
      return;
    }
    if (el.classList.contains('flip')) { flipCard(el); return; }
    if (el.dataset.thief) { const r = E.catchThief(S, +el.dataset.thief); handle(r.ev); bubbleSig = ''; return; }
    if (el.dataset.uid) { tapRecord(+el.dataset.uid); return; }
    if (el.dataset.f) { filter = el.dataset.f; crateSig = ''; AU.sfx('click'); return; }
    if (el.dataset.tab) { AU.sfx('click'); showEvening(el.dataset.tab); return; }
    if (el.dataset.up) { if (E.buyUpgrade(S, el.dataset.up)) { AU.sfx('till'); toast('Upgrade bought!', 'teal'); } showEvening('ups'); return; }
    if (el.dataset.frame) { if (!E.toggleWall(S, +el.dataset.frame)) toast('No free frames. Unframe one first, or buy more frames.', 'red'); else AU.sfx('pop'); showEvening('wall'); return; }
    if (el.dataset.window) { const it = S.stock.find(x => x.uid === +el.dataset.window); if (it) { S.windowId = it.id; S.window = E.recOf(it).genre; AU.sfx('pop'); } showEvening('wall'); return; }
    if (el.dataset.lot) {
      const dig = E.buyLot(S, el.dataset.lot);
      if (!dig) { toast('Not enough cash for that one.', 'red'); return; }
      AU.sfx('cash'); showDig(dig); return;
    }
    switch (el.dataset.a) {
      case 'new': S = E.newGame(); tipsShown = {}; filter = 'all'; AU.sfx('till'); showMorning(); break;
      case 'continue': S = E.load(); if (!S) return showTitle(); filter = 'all'; if (S.phase === 'evening') { lastSum = null; showEvening('today'); } else if (S.phase === 'shop' || S.phase === 'dig') openShop(); else showMorning(); break;
      case 'how': showHow(); break;
      case 'back': showTitle(); break;
      case 'intro': ev.preventDefault(); AU.stop(); playIntro(showTitle); break;
      case 'skipdig': S.phase = 'dig'; openShop(); break;
      case 'flipall': screen.querySelectorAll('.flip:not(.open)').forEach((f, i) => setTimeout(() => flipCard(f), i * 140)); break;
      case 'open': openShop(); break;
      case 'turntable': cycleTurntable(); break;
      case 'away': { const r = E.sendAway(S); handle(r); AU.sfx('click'); bubbleSig = ''; break; }
      case 'buyin': { const r = E.buyFromSeller(S); if (!r.ok) toast(r.why === 'full' ? 'Your racks are full! Buy an extra rack tonight.' : 'Not enough cash in the till.', 'red'); else { handle(r.ev); AU.sfx('cash'); float(850, 300, r.isNew ? 'NEW FIND!' : 'Bought!', 'pink'); if ('RL'.includes(E.recOf(r.it).rarity)) AU.sfx('rare'); } bubbleSig = ''; crateSig = ''; break; }
      case 'deal': { const cu = E.front(S), a = cu && actors.get(cu.cid); const r = E.haggle(S, false); if (r) { handle(r.ev); saleDone(r, a, cu); } bubbleSig = ''; crateSig = ''; break; }
      case 'push': { const cu = E.front(S); const r = E.haggle(S, true); if (!r) break; handle(r.ev); if (r.up) { AU.sfx('cash'); AU.speak(r.say, { who: cu.reg, seed: cu.look.seed, mood: 'cross' }); reaction = { cid: cu.cid, text: r.say, until: t + 3 }; } else { AU.sfx('fail'); AU.speak(r.say, { who: cu.reg, seed: cu.look.seed, mood: 'angry' }); toast(esc(r.say), 'red'); } bubbleSig = ''; break; }
      case 'cat': if (E.petCat(S)) { AU.sfx('meow'); float(cat.x, 470, '♥ purr ♥', 'pink'); toast('Wax the cat calms everyone down.', 'teal'); bubbleSig = ''; } else AU.sfx('meow'); break;
      case 'pause': paused = !paused; $('#hPause').textContent = paused ? '▶ Resume' : '⏸ Pause'; AU.duck(paused); break;
      case 'unpause': paused = false; el.closest('.panel').remove(); break;
      case 'mute': AU.setMuted(!AU.muted); el.textContent = AU.muted ? '🔇' : '🔊'; break;
      case 'payrent': { const r = E.payRent(S); if (r.over) { showOver(); break; } if (r.paid) { AU.sfx('till'); toast(`Rent paid. Mr Grimsby grunts and leaves.`, 'teal'); } else { AU.sfx('fail'); toast(`Short by ${money(r.due - r.part)}. That's strike ${r.strikes}. One more and the shop closes!`, 'red'); } showEvening('today'); break; }
      case 'sleep': E.nextDay(S); AU.sfx('click'); showMorning(); break;
      case 'menu': E.save(S); AU.stop(); showTitle(); break;
    }
  });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'm' || ev.key === 'M') { const b = $('#hMute'); if (b) b.click(); return; }
    if (mode === 'dig' && (ev.key === ' ' || ev.key === 'Enter')) {
      ev.preventDefault();
      const openBtn = $('#openBtn');
      if (openBtn && openBtn.style.display !== 'none') openBtn.click();
      else { const fa = screen.querySelector('[data-a="flipall"]'); if (fa) fa.click(); }
      return;
    }
    if (mode !== 'shop') return;
    if (ev.key === ' ' || ev.key === 'p') { ev.preventDefault(); const b = $('#hPause'); if (b) b.click(); }
    if (ev.key === 't' || ev.key === 'T') { cycleTurntable(); }
    if (ev.key === 'Escape') { const b = layer.querySelector('[data-a="away"]'); if (b) b.click(); }
    if (ev.key >= '1' && ev.key <= '9') {
      const tiles = crate.querySelectorAll('.tile[data-uid]');
      const tile = tiles[+ev.key - 1];
      if (tile) tapRecord(+tile.dataset.uid);
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'shop' && !paused) { const b = $('#hPause'); if (b) b.click(); } });

  // ---------- main loop ----------
  AU.onBeat = k => { beat = k; };
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (mode === 'shop' && S && S.today && !paused) {
      handle(E.step(S, dt));
      placeActors();
      if (S.today.closed && !closing) { closing = true; setTimeout(endDay, 1200); }
    }
    if (!paused) { updateActors(dt); updateParts(dt); updateCat(dt); }
    if (mode === 'shop' && S) { const np = S.nowPlaying && S.stock.find(x => x.uid === S.nowPlaying); const pl = AU.playing(); if (np && (!pl || pl.id !== np.id)) AU.play(E.recOf(np)); else if (!np && pl) AU.stop(); }
    if (AU.playing()) ang += dt * 3.5;
    bell = Math.max(0, bell - dt * 1.5); beat = Math.max(0, beat - dt * 4);
    draw();
    if (mode === 'shop' && S && S.today) { renderCrate(); renderBubbles(); }
    updateHud();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // test hook for automated checks
  window.__crs = { get S() { return S; }, set S(v) { S = v; }, openShop, showMorning, showEvening, showTitle, get mode() { return mode; } };

  playIntro(showTitle);
})();
