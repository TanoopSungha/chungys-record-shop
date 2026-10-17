// Chungy's Record Shop: game rules. No DOM in here, so it can be tested in Node.
(function (G) {
  'use strict';
  const D = G.CRS_DATA;
  const { GENRES, GENRE_IDS, MOODS, ERAS, ERA_TALK, RARITY, GRADES, CATALOGUE, BY_ID, LOTS, REGULARS, UPGRADES, GOALS } = D;

  const DAY_LEN = 150;          // seconds of shop time per day (10:00 to 18:00)
  const MAX_IN_SHOP = 6;
  const SAVE_KEY = 'chungy-record-shop-v1';

  let R = Math.random;          // swapped for a seeded one in tests
  const rand = (a, b) => a + R() * (b - a);
  const chance = p => R() < p;
  const pickR = a => a[Math.floor(R() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function weighted(items, w) { let t = 0; for (const i of items) t += w(i); let x = R() * t; for (const i of items) { x -= w(i); if (x <= 0) return i; } return items[items.length - 1]; }

  // ---------- new game ----------
  function newGame() {
    const S = {
      v: 1, day: 1, cash: 70, xp: 0, level: 1, ratings: [3, 3, 3, 3], strikes: 0,
      stock: [], wall: [], nowPlaying: null, found: {}, soldIds: {}, uid: 1,
      up: Object.fromEntries(UPGRADES.map(u => [u.id, 0])),
      regs: Object.fromEntries(REGULARS.map(r => [r.id, { hearts: 0, met: false, visits: 0 }])),
      stats: { sold: 0, earned: 0, perfect: 0, bestCombo: 0, served: 0, digs: 0, caught: 0 },
      goals: [], goalsDone: 0, catPetted: false, phase: 'morning', lots: null, lastDig: null, log: [],
      window: null, // genre in the window display (free once you own a wall frame)
    };
    // A starter crate so day one is playable: one record from each starting genre.
    for (const g of GENRE_IDS.filter(g => GENRES[g].unlock <= 1)) {
      const pool = CATALOGUE.filter(r => r.genre === g && r.rarity === 'C');
      addRecord(S, pickR(pool).id, 'VG+');
      addRecord(S, pickR(pool).id, 'VG');
    }
    S.nowPlaying = S.stock[0].uid;
    startMorning(S);
    return S;
  }

  function addRecord(S, id, grade) {
    const rec = { uid: S.uid++, id, grade };
    S.stock.push(rec); S.found[id] = true;
    return rec;
  }
  const recOf = it => BY_ID[it.id];
  function valueOf(it) { const g = GRADES.find(x => x.id === it.grade) || GRADES[2]; return Math.max(2, Math.round(recOf(it).base * g.mult)); }
  const stockCap = S => UPGRADES[0].cap[S.up.rack];
  const wallSlots = S => S.up.wall ? UPGRADES.find(u => u.id === 'wall').slots[S.up.wall - 1] : 0;
  const week = S => Math.floor((S.day - 1) / 7) + 1;
  const weekday = S => (S.day - 1) % 7;        // 0 = Monday
  const hasPerk = (S, id) => REGULARS.some(r => r.perk.id === id && S.regs[r.id].hearts >= 5);
  const unlockedGenres = S => GENRE_IDS.filter(g => GENRES[g].unlock <= S.level);
  const xpFor = lvl => Math.round(70 * Math.pow(lvl, 1.45));

  function rating(S) {
    const rs = S.ratings.slice(-25);
    let r = rs.reduce((a, b) => a + b, 0) / rs.length;
    for (const uid of S.wall) { const it = S.stock.find(x => x.uid === uid); if (it) r += recOf(it).rarity === 'L' ? 0.3 : recOf(it).rarity === 'R' ? 0.15 : 0.08; }
    if (hasPerk(S, 'sign')) r += 0.5;
    return clamp(r, 0.5, 5);
  }

  function gainXP(S, n, ev) {
    S.xp += n;
    while (S.xp >= xpFor(S.level)) {
      S.xp -= xpFor(S.level); S.level++;
      const newG = GENRE_IDS.filter(g => GENRES[g].unlock === S.level).map(g => GENRES[g].name);
      const newR = REGULARS.filter(r => r.unlock === S.level).map(r => r.name);
      ev && ev.push({ t: 'level', level: S.level, genres: newG, regs: newR });
    }
  }

  // ---------- morning: pick a lot ----------
  function startMorning(S) {
    S.phase = 'morning';
    const wk = week(S);
    const avail = LOTS.filter(l => l.minLevel <= S.level && (!l.van || S.up.van));
    const pool = avail.slice();
    const lots = [];
    // Always offer the cheapest available so you are never stuck.
    lots.push(pool.shift());
    while (lots.length < 3 && pool.length) lots.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
    S.lots = lots.map(l => ({ ...l, cost: Math.round(l.cost * (1 + 0.07 * (wk - 1))), items: rollLot(S, l) }));
    S.goals = makeGoals(S);
    S.event = rollEvent(S);
    S.catPetted = false;
  }

  function rollEvent(S) {
    const wd = weekday(S);
    if (wd === 5 && week(S) % 3 === 0) return { id: 'rsd', name: 'Record Store Day!', desc: 'Queues round the block. Double customers, and collectors are out in force.' };
    if (wd === 4) return { id: 'payday', name: 'Payday Friday', desc: 'Everyone\'s just been paid: tips are 50% bigger.' };
    if (S.day > 2 && chance(0.18)) return { id: 'rain', name: 'Pouring with rain', desc: 'Fewer customers, but they\'re in no hurry to go back outside.' };
    if (S.day > 3 && chance(0.2)) { const g = pickR(unlockedGenres(S)); return { id: 'festival', genre: g, name: GENRES[g].name + ' festival in town', desc: `Loads of ${GENRES[g].name} fans about today, and they pay well.` }; }
    return null;
  }

  function makeGoals(S) {
    const out = [], pool = GOALS.slice();
    while (out.length < 3 && pool.length) {
      const g = pool.splice(Math.floor(R() * pool.length), 1)[0];
      if (g.id === 'regular' && S.day < 2) continue;
      const tier = Math.min(g.n.length - 1, Math.floor((S.level - 1) / 2));
      const n = g.n[tier];
      const genre = g.genre ? pickR(unlockedGenres(S)) : null;
      out.push({ id: g.id, n, genre, text: g.text(n, genre), reward: g.reward + 10 * tier, have: 0, done: false });
    }
    return out;
  }
  function goalTick(S, id, amt, ev, opts) {
    for (const g of S.goals) {
      if (g.done || g.id !== id) continue;
      if (g.genre && opts && opts.genre !== g.genre) continue;
      if (id === 'combo' || id === 'earn') g.have = Math.max(g.have, amt); else g.have += amt;
      if (g.have >= g.n) { g.done = true; S.cash += g.reward; S.goalsDone++; gainXP(S, 15, ev); ev && ev.push({ t: 'goal', text: g.text, reward: g.reward }); }
    }
  }

  // Roll the records in a lot (not paid for yet: used by both preview and buy).
  function rollLot(S, lot) {
    const out = [];
    const torch = 1 + 0.35 * S.up.torch;
    const genres = unlockedGenres(S);
    for (let i = 0; i < lot.n; i++) {
      const rar = weighted(['C', 'U', 'R', 'L'], k => k === 'C' ? RARITY.C.w : k === 'U' ? RARITY.U.w * lot.luck : k === 'R' ? RARITY.R.w * lot.luck * torch : RARITY.L.w * lot.luck * torch * (S.level >= 2 ? 1 : 0.3));
      let gs = lot.bias ? genres.filter(g => lot.bias.includes(g)) : genres;
      if (!gs.length) gs = genres;
      const g = pickR(gs);
      let pool = CATALOGUE.filter(r => r.genre === g && r.rarity === rar);
      if (!pool.length) pool = CATALOGUE.filter(r => r.genre === g && r.rarity === 'R');
      // Lean towards records you have never found, so the Crate Book fills up.
      const fresh = pool.filter(r => !S.found[r.id]);
      const rec = fresh.length && chance(0.65) ? pickR(fresh) : pickR(pool);
      const grade = weighted(GRADES, gr => lot.mystery ? (gr.id === 'G' ? 30 : gr.w) : gr.w).id;
      out.push({ id: rec.id, grade });
    }
    return out;
  }

  function lotHint(S, lot) {
    if (!lot.items) return null;
    const best = lot.items.reduce((a, b) => (valueOf(b) > valueOf(a) ? b : a));
    const tot = lot.items.reduce((a, b) => a + valueOf(b), 0);
    return { best: BY_ID[best.id], value: tot };
  }

  function buyLot(S, lotId) {
    const lot = S.lots.find(l => l.id === lotId);
    if (!lot || S.cash < lot.cost) return null;
    S.cash -= lot.cost; S.stats.digs++;
    const items = (lot.items || rollLot(S, lot)).map(x => ({ ...x, isNew: !S.found[x.id] }));
    const kept = [];
    let resold = 0, overflow = 0;
    // No rack space left? Chungy's mate Dave takes the extras off his hands for 40% of their value.
    for (const x of items) { if (S.stock.length < stockCap(S)) kept.push(addRecord(S, x.id, x.grade)); else { S.found[x.id] = true; overflow++; resold += Math.round(valueOf(x) * 0.4); } }
    S.cash += resold;
    S.lots = S.lots.filter(l => l.id !== lotId);
    S.lastDig = { lot: lot.id, items, overflow, resold };
    return S.lastDig;
  }

  // ---------- shop day ----------
  function openShop(S) {
    S.phase = 'shop';
    S.today = { t: 0, next: 1.5, cust: [], queue: [], cid: 1, combo: 0, takings: 0, perfect: 0, served: 0, lost: 0, coffee: 0, bought: 0, regsToday: [], happyRegs: 0, regVisits: pickRegularsToday(S) };
  }

  function pickRegularsToday(S) {
    const pool = REGULARS.filter(r => r.unlock <= S.level);
    const n = Math.min(pool.length, S.day === 1 ? 1 : (chance(0.5) ? 2 : 1));
    const out = [];
    while (out.length < n) { const r = weighted(pool.filter(p => !out.includes(p.id)), p => 1 + (S.regs[p.id].met ? 0 : 2)).id; out.push(r); }
    return out.map((id, i) => ({ id, at: rand(15 + i * 50, 45 + i * 55) }));
  }

  function spawnInterval(S) {
    const T = S.today, wd = weekday(S);
    let mult = (0.55 + rating(S) * 0.17) * (1 + 0.2 * S.up.neon);
    if (wd === 5) mult *= hasPerk(S, 'djset') ? 1.6 : 1.25;
    if (wd === 6) mult *= 0.85;
    if (S.event?.id === 'rsd') mult *= 2;
    if (S.event?.id === 'rain') mult *= 0.7;
    if (T.t < 5) mult *= 1.5;
    return 8.5 / mult;
  }

  // Which genre walks in? The turntable, window, wall and events all pull in their fans.
  function customerGenre(S) {
    const gs = unlockedGenres(S);
    const np = S.nowPlaying && S.stock.find(x => x.uid === S.nowPlaying);
    return weighted(gs, g => {
      let w = 1;
      if (np && recOf(np).genre === g) w += 0.6 + 0.5 * S.up.speakers;
      if (S.window === g) w += 0.5;
      for (const uid of S.wall) { const it = wallItem(S, uid); if (it && recOf(it).genre === g) w += 0.3; }
      if (S.event?.id === 'festival' && S.event.genre === g) w += 2;
      if ((g === 'punk' || g === 'metal') && hasPerk(S, 'goths')) w += 0.4;
      return w;
    });
  }
  const wallItem = (S, uid) => S.stock.find(x => x.uid === uid);

  // Build what the customer asks for. Most requests can be met from current stock, some can't.
  function makeRequest(S, genre, kind) {
    const forSale = S.stock.filter(x => !S.wall.includes(x.uid));
    if (kind === 'collector') {
      const want = forSale.filter(x => 'RL'.includes(recOf(x).rarity));
      const tgt = want.length && chance(0.75) ? recOf(pickR(want)) : pickR(CATALOGUE.filter(r => r.rarity !== 'C' && GENRES[r.genre].unlock <= S.level));
      return { req: { id: tgt.id }, text: `I'm hunting for "${tgt.title}" by ${tgt.artist}. Any chance?`, genre: tgt.genre };
    }
    const mine = forSale.filter(x => recOf(x).genre === genre);
    const base = mine.length && chance(0.8) ? recOf(pickR(mine)) : null;
    const lvl = S.level;
    const shape = weighted(['genre', 'clue', 'clue+mood', 'genre+era', 'mood+era', 'genre+mood'], s =>
      s === 'genre' ? Math.max(0.6, 3 - lvl * 0.5) : s === 'clue' ? 2 : s === 'clue+mood' ? (lvl >= 2 ? 2 : 0.5) : s === 'genre+era' ? 1 : s === 'mood+era' ? (lvl >= 3 ? 1 : 0) : 1.5);
    const mood = base ? pickR(base.moods) : pickR(GENRES[genre].moods);
    const era = base ? base.era : pickR(ERAS);
    const gn = GENRES[genre].name, clue = pickR(GENRES[genre].clues), mp = pickR(MOODS[mood]);
    switch (shape) {
      case 'genre': return { req: { genre }, text: pickR([`Got any ${gn}?`, `Where's your ${gn} section?`, `I'm after some ${gn}, please.`]), genre };
      case 'clue': return { req: { genre }, text: cap(`${pickR(['I want ', 'Looking for ', 'Got anything... '])}${clue}?`), genre };
      case 'clue+mood': return { req: { genre, mood }, text: cap(`${clue}... but ${mp}.`), genre };
      case 'genre+era': return { req: { genre, era }, text: `Any ${gn} ${ERA_TALK[era]}?`, genre };
      case 'mood+era': return { req: { mood, era }, text: cap(`Anything ${ERA_TALK[era]}, ${mp}? Any style.`), genre };
      default: return { req: { genre, mood }, text: `${gn}, ${mp}. Go on, surprise me.`, genre };
    }
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  function makeLook(genre, seed) {
    const r = D.rng(seed), T = D.TRIBES[genre];
    const eyes = ['#6b4226', '#3b2414', '#4e7a9a', '#4e8c6f', '#7a5230', '#5a6b4c'][Math.abs(seed) % 6];
    const lashes = (Math.abs(seed >> 3) % 2) === 0;
    const lips = lashes && (Math.abs(seed >> 5) % 3) === 0 ? ['#d96b7a', '#c85064', '#b84a62'][Math.abs(seed >> 7) % 3] : null;
    return {
      skin: D.pick(r, D.SKIN), hair: D.pick(r, T.hair), hairCol: T.hairCol && r() < 0.7 ? D.pick(r, T.hairCol) : D.pick(r, D.HAIRCOL),
      top: D.pick(r, T.top), col: D.pick(r, T.cols), legs: D.pick(r, ['#2b3a67', '#222', '#4a3b2a', '#5b6470', '#1d3b2a']),
      acc: D.pick(r, T.acc), build: 0.82 + r() * 0.4, h: 0.88 + r() * 0.2, seed,
      pattern: r() < 0.22 ? 'stripes' : r() < 0.1 ? 'spots' : 'plain', bag: r() < 0.28 ? D.pick(r, ['#f1e4c8', '#c9e4d8', '#f6c7d8', '#d8d0f0']) : null,
      shoes: D.pick(r, ['#231a1a', '#231a1a', '#f4f4f4', '#c3001b', '#6b3e22']),
      eyes, lashes, lips,
    };
  }

  function spawn(S, ev, force) {
    const T = S.today;
    const id = T.cid++;
    let c;
    if (force && force.reg) {
      const RG = REGULARS.find(r => r.id === force.reg);
      const g = pickR(RG.likes.filter(x => GENRES[x].unlock <= S.level).concat(RG.likes[0]));
      const rq = makeRequest(S, g, 'buyer');
      if (!rq.req.mood && chance(0.6)) { rq.req.mood = pickR(RG.moods); rq.text = (/[.?!]$/.test(rq.text) ? rq.text : rq.text + '.') + ` Something ${pickR(MOODS[rq.req.mood])}.`; }
      c = { kind: 'regular', reg: RG.id, name: RG.name, look: { ...RG.look, legs: '#2b3a67', seed: id }, ...rq, tries: 2 };
      S.regs[RG.id].visits++;
      T.regsToday.push(RG.id);
    } else {
      const g = customerGenre(S);
      const roll = R();
      const thief = S.day > 2 && roll < 0.06 && S.stock.length > 3;
      const seller = !thief && roll < 0.16 && S.day > 1;
      const collector = !thief && !seller && (roll < (S.event?.id === 'rsd' ? 0.32 : 0.22)) && S.level >= 2;
      const seed = (S.day * 1000 + id) * 7919;
      const name = D.NAMES[seed % D.NAMES.length];
      if (thief) c = { kind: 'thief', name: 'Hooded figure', look: { ...makeLook(g, seed), top: 'hoodie', col: '#3a3a44', hair: 'hood' }, genre: g, text: '' };
      else if (seller) {
        const it = rollLot(S, { n: 1, luck: 1.4 })[0];
        const val = valueOf(it);
        c = { kind: 'seller', name, look: makeLook(recOf(it).genre, seed), genre: recOf(it).genre, offer: it, ask: Math.max(2, Math.round(val * rand(0.35, 0.8))), text: `Clearing out my ${pickR(['dad\'s', 'loft', 'ex\'s', 'nan\'s', 'old'])} records. Want this one?` };
      } else {
        const kind = collector ? 'collector' : 'buyer';
        c = { kind, name, look: makeLook(g, seed), tries: 2, ...makeRequest(S, g, kind) };
        if (kind === 'collector') c.look = { ...c.look, acc: 'glasses' };
      }
    }
    const npg = S.nowPlaying && S.stock.find(x => x.uid === S.nowPlaying);
    let pat = rand(24, 32) * (S.event?.id === 'rain' ? 1.3 : 1);
    if (S.up.booth) pat *= 1.25;
    if (hasPerk(S, 'cake')) pat *= 1.15;
    if (c.kind === 'regular') pat *= 1.3;
    c.vibe = !!(npg && recOf(npg).genre === c.genre);
    if (c.vibe) pat *= 1.2;
    Object.assign(c, { cid: id, state: 'enter', st: 0, browse: rand(2.5, 5.5), patience: pat, maxPat: pat, face: 'neutral' });
    T.cust.push(c);
    ev && ev.push({ t: 'enter', cid: id, kind: c.kind, reg: c.reg });
    return c;
  }

  // Advance the shop by dt seconds. Returns events for the UI.
  function step(S, dt) {
    const T = S.today, ev = [];
    if (!T || S.phase !== 'shop') return ev;
    T.t += dt;
    if (T.t < DAY_LEN) {
      T.next -= dt;
      const inShop = T.cust.filter(c => c.state !== 'gone').length;
      if (T.next <= 0) { if (inShop < MAX_IN_SHOP) spawn(S, ev); T.next = spawnInterval(S) * rand(0.6, 1.4); }
      for (const rv of T.regVisits) if (!rv.done && T.t >= rv.at && inShop < MAX_IN_SHOP + 1) { rv.done = true; spawn(S, ev, { reg: rv.id }); }
    }
    for (const c of T.cust) {
      c.st += dt;
      if (c.state === 'enter' && c.st > 1.6) { c.state = 'browse'; c.st = 0; }
      else if (c.state === 'browse' && c.st > c.browse) {
        if (c.kind === 'thief') {
          const pool = S.stock.filter(x => !S.wall.includes(x.uid) && x.uid !== S.nowPlaying);
          if (!pool.length) { c.state = 'leaving'; c.st = 0; continue; }
          c.loot = pickR(pool).uid; c.state = 'sneak'; c.st = 0;
          if (hasPerk(S, 'bouncer')) { catchThief(S, c.cid, ev, true); continue; }
          ev.push({ t: 'thief', cid: c.cid });
        } else { c.state = 'queue'; c.st = 0; T.queue.push(c.cid); ev.push({ t: 'queue', cid: c.cid }); }
      } else if (c.state === 'sneak' && c.st > 3.6) {
        const i = S.stock.findIndex(x => x.uid === c.loot);
        if (i >= 0) { const it = S.stock[i]; S.stock.splice(i, 1); if (S.nowPlaying === it.uid) S.nowPlaying = S.stock[0] ? S.stock[0].uid : null; ev.push({ t: 'stolen', cid: c.cid, rec: it.id }); }
        c.state = 'leaving'; c.st = 0;
      } else if (c.state === 'queue') {
        const front = T.queue[0] === c.cid;
        c.patience -= dt * (front ? 1 : 0.45) * (T.t >= DAY_LEN ? 3 : 1);
        const p = c.patience / c.maxPat;
        c.face = p > 0.6 ? 'neutral' : p > 0.3 ? 'meh' : 'cross';
        if (c.patience <= 0) leave(S, c, 0, 'angry', ev);
      } else if (c.state === 'leaving' && c.st > 2.2) c.state = 'gone';
    }
    T.cust = T.cust.filter(c => c.state !== 'gone' || c.st < 0.1);
    if (T.t >= DAY_LEN && !T.cust.some(c => c.state !== 'gone' && c.state !== 'leaving')) { T.closed = true; }
    return ev;
  }

  function leave(S, c, stars, face, ev) {
    const T = S.today;
    c.state = 'leaving'; c.st = 0; c.face = face;
    T.queue = T.queue.filter(x => x !== c.cid);
    if (stars != null && c.kind !== 'thief') S.ratings.push(stars);
    if (S.up.coffee && c.kind !== 'thief') { S.cash += 2; T.coffee += 2; T.takings += 2; }
    if (stars != null && stars < 2.5 && c.kind !== 'seller') { if (T.combo > 0) ev && ev.push({ t: 'comboLost', n: T.combo }); T.combo = 0; }
    ev && ev.push({ t: 'leave', cid: c.cid, face });
  }

  const front = S => S.today && S.today.cust.find(c => c.cid === S.today.queue[0]);

  // How well does a record fit a request? 0..1
  function matchScore(req, rec) {
    if (req.id) return rec.id === req.id ? 1 : (BY_ID[req.id].genre === rec.genre ? 0.25 : 0);
    let tot = 0, got = 0;
    if (req.genre) { tot += 3; if (rec.genre === req.genre) got += 3; }
    if (req.mood) { tot += 2; if (rec.moods.includes(req.mood)) got += 2; }
    if (req.era) { tot += 1; if (rec.era === req.era) got += 1; else if (Math.abs(ERAS.indexOf(rec.era) - ERAS.indexOf(req.era)) === 1) got += 0.4; }
    return tot ? got / tot : 0;
  }

  // Hand a record to the customer at the counter.
  function offer(S, uid) {
    const T = S.today, c = front(S), ev = [];
    if (!c || c.kind === 'seller' || c.kind === 'thief') return { ev, ok: false };
    const it = S.stock.find(x => x.uid === uid);
    if (!it || S.wall.includes(uid)) return { ev, ok: false };
    const rec = recOf(it), sc = matchScore(c.req, rec);
    if (sc < 0.55) {
      c.tries--;
      c.face = 'meh';
      if (c.tries <= 0) { leave(S, c, 1, 'cross', ev); return { ev, ok: false, score: sc, gone: true, say: pickR(['Nah. Not for me.', 'That\'s not it at all.', 'I\'ll try online.']) }; }
      c.patience = Math.max(c.patience - c.maxPat * 0.15, 2);
      return { ev, ok: false, score: sc, say: pickR(['Hmm, not quite...', 'Nah, not really what I meant.', 'Close-ish? Not really.', 'Got anything else?']) };
    }
    const perfect = sc >= 0.99;
    const val = valueOf(it);
    let price = Math.round(val * (0.75 + 0.35 * sc) * (c.kind === 'collector' ? 1.6 : 1));
    if (hasPerk(S, 'dancefloor') && rec.moods.includes('party')) price = Math.round(price * 1.25);
    if (S.event?.id === 'festival' && S.event.genre === rec.genre) price = Math.round(price * 1.3);
    if (c.kind === 'regular' && c.reg === 'pip') price = Math.min(price, 4);
    let tip = 0;
    if (perfect) { T.combo++; T.perfect++; S.stats.perfect++; S.stats.bestCombo = Math.max(S.stats.bestCombo, T.combo); tip = Math.round(price * 0.08 * Math.min(T.combo, 10)) + 1; }
    else { if (T.combo > 0) ev.push({ t: 'comboLost', n: T.combo }); T.combo = 0; }
    if (c.vibe) tip += Math.round(price * (0.1 + 0.1 * S.up.speakers));
    if (S.event?.id === 'payday') tip = Math.round(tip * 1.5);
    if (hasPerk(S, 'goths') && (rec.genre === 'punk' || rec.genre === 'metal')) tip *= 2;
    const res = { ev, ok: true, perfect, score: sc, price, tip, rec, combo: T.combo, cid: c.cid };
    if (c.kind === 'collector' && perfect) { c.state = 'haggle'; c.haggle = { uid, price, tip, round: 0 }; res.haggle = true; return res; }
    completeSale(S, c, it, price, tip, perfect, sc, res);
    return res;
  }

  function completeSale(S, c, it, price, tip, perfect, sc, res) {
    const T = S.today, ev = res.ev, rec = recOf(it);
    S.stock = S.stock.filter(x => x.uid !== it.uid);
    if (S.nowPlaying === it.uid) { // the needle moves to another record of the same sound
      const nx = S.stock.find(x => !S.wall.includes(x.uid) && recOf(x).genre === rec.genre) || S.stock[0];
      S.nowPlaying = nx ? nx.uid : null;
    }
    S.cash += price + tip; T.takings += price + tip; T.served++; S.stats.sold++; S.stats.served++; S.stats.earned += price + tip;
    S.soldIds[rec.id] = (S.soldIds[rec.id] || 0) + 1;
    gainXP(S, 6 + (perfect ? 6 : 0) + ({ C: 0, U: 3, R: 8, L: 20 })[rec.rarity] + Math.min(T.combo, 5), ev);
    goalTick(S, 'genre', 1, ev, { genre: rec.genre });
    if (perfect) goalTick(S, 'perfect', 1, ev);
    goalTick(S, 'combo', T.combo, ev);
    goalTick(S, 'earn', T.takings, ev);
    if ('RL'.includes(rec.rarity)) goalTick(S, 'rare', 1, ev);
    if (c.kind === 'regular' && sc >= 0.8) {
      const st = S.regs[c.reg];
      st.met = true;
      if (st.hearts < 5) {
        st.hearts++;
        const RG = REGULARS.find(r => r.id === c.reg);
        res.regLine = RG.lines[st.hearts - 1];
        res.hearts = st.hearts;
        if (st.hearts === 5) ev.push({ t: 'perk', reg: RG.id, perk: RG.perk });
      }
      T.happyRegs++; goalTick(S, 'regular', 1, ev);
    } else if (c.kind === 'regular') { S.regs[c.reg].met = true; }
    leave(S, c, perfect ? 5 : sc >= 0.8 ? 4 : 3, perfect ? 'joy' : 'happy', ev);
  }

  // Collectors haggle over a perfect find. push: true = hold out for more.
  function haggle(S, push) {
    const c = front(S), ev = [];
    if (!c || c.state !== 'haggle') return null;
    const h = c.haggle, it = S.stock.find(x => x.uid === h.uid);
    if (!it) { c.state = 'queue'; return null; }
    if (!push) { const res = { ev, ok: true, perfect: true, score: 1, price: h.price, tip: h.tip, rec: recOf(it), combo: S.today.combo, cid: c.cid }; completeSale(S, c, it, h.price, h.tip, true, 1, res); return res; }
    h.round++;
    const p = 0.75 - 0.25 * h.round;
    if (chance(p)) { h.price = Math.round(h.price * rand(1.18, 1.35)); return { ev, haggle: true, up: true, price: h.price, say: pickR(['Alright, alright! Fine.', 'You drive a hard bargain...', 'Ugh. OK. But that\'s my last offer.']) }; }
    c.state = 'queue'; leave(S, c, 2, 'cross', ev);
    return { ev, walked: true, say: 'Forget it. I\'ll find it somewhere else.' };
  }

  function sendAway(S) {
    const c = front(S), ev = [];
    if (!c) return ev;
    if (c.kind === 'seller') { leave(S, c, null, 'neutral', ev); return ev; }
    leave(S, c, 2.5, 'meh', ev);
    return ev;
  }

  function buyFromSeller(S) {
    const c = front(S), ev = [];
    if (!c || c.kind !== 'seller') return { ok: false };
    if (S.cash < c.ask) return { ok: false, why: 'cash' };
    if (S.stock.length >= stockCap(S)) return { ok: false, why: 'full' };
    S.cash -= c.ask; S.today.takings -= c.ask; S.today.bought++;
    const isNew = !S.found[c.offer.id];
    const it = addRecord(S, c.offer.id, c.offer.grade);
    goalTick(S, 'buyin', 1, ev);
    gainXP(S, 4, ev);
    leave(S, c, 4, 'happy', ev);
    return { ok: true, ev, it, isNew, value: valueOf(it) };
  }

  function catchThief(S, cid, ev, auto) {
    ev = ev || [];
    const c = S.today.cust.find(x => x.cid === cid);
    if (!c || c.kind !== 'thief' || (c.state !== 'sneak' && c.state !== 'browse')) return { ok: false, ev };
    c.state = 'leaving'; c.st = 0; c.face = 'cross'; c.caught = true;
    S.stats.caught++; S.ratings.push(4.5); gainXP(S, 8, ev);
    ev.push({ t: 'caught', cid, auto: !!auto });
    return { ok: true, ev };
  }

  function petCat(S) {
    if (!S.up.cat || S.catPetted || !S.today) return false;
    S.catPetted = true;
    for (const c of S.today.cust) if (c.state === 'queue' || c.state === 'browse') { c.patience = Math.min(c.maxPat, c.patience + c.maxPat * 0.4); c.face = 'happy'; }
    return true;
  }

  function setPlaying(S, uid) { if (S.stock.some(x => x.uid === uid)) S.nowPlaying = uid; }

  function toggleWall(S, uid) {
    if (S.wall.includes(uid)) { S.wall = S.wall.filter(x => x !== uid); return true; }
    if (S.wall.length >= wallSlots(S) || !S.stock.some(x => x.uid === uid)) return false;
    S.wall.push(uid); return true;
  }

  // ---------- evening ----------
  function closeShop(S) {
    const T = S.today;
    S.phase = 'evening';
    S.stats.days = S.day;
    const sum = { takings: T.takings, served: T.served, perfect: T.perfect, coffee: T.coffee, regs: T.happyRegs, rating: rating(S), goals: S.goals.filter(g => g.done).length, rentDue: weekday(S) === 6 ? D.rentFor(week(S)) : 0 };
    S.today = null;
    return sum;
  }

  function payRent(S) {
    const due = D.rentFor(week(S));
    if (S.cash >= due) { S.cash -= due; return { paid: true, due }; }
    S.strikes++;
    const paid = S.cash; S.cash = 0;
    return { paid: false, due, part: paid, strikes: S.strikes, over: S.strikes >= 2 };
  }

  function upgradeCost(S, id) { const u = UPGRADES.find(x => x.id === id); const lv = S.up[id]; return lv < u.levels.length ? u.levels[lv] : null; }
  function buyUpgrade(S, id) { const c = upgradeCost(S, id); if (c == null || S.cash < c) return false; S.cash -= c; S.up[id]++; return true; }

  function nextDay(S) { S.day++; startMorning(S); }

  function save(S, store) { try { (store || G.localStorage).setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage may be unavailable */ } }
  function load(store) { try { const s = (store || G.localStorage).getItem(SAVE_KEY); if (!s) return null; const S = JSON.parse(s); return S && S.v === 1 ? S : null; } catch (e) { return null; } }
  function wipe(store) { try { (store || G.localStorage).removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

  G.CRS = {
    DAY_LEN, newGame, startMorning, buyLot, lotHint, rollLot, openShop, step, spawn, offer, haggle, sendAway, buyFromSeller, catchThief, petCat,
    setPlaying, toggleWall, closeShop, payRent, upgradeCost, buyUpgrade, nextDay, save, load, wipe,
    matchScore, valueOf, recOf, stockCap, wallSlots, week, weekday, rating, hasPerk, unlockedGenres, xpFor, front,
    setRandom: f => { R = f; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
