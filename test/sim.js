// Headless test: plays many in-game weeks with a simple bot and checks the rules hold together.
require('../src/data.js');
require('../src/engine.js');
const assert = require('assert');
const D = globalThis.CRS_DATA, E = globalThis.CRS;

assert.strictEqual(D.CATALOGUE.length, 10 * 13 + 10, 'catalogue size');
assert.strictEqual(new Set(D.CATALOGUE.map(r => r.id)).size, D.CATALOGUE.length, 'unique ids');
for (const r of D.CATALOGUE) { assert(r.base > 0); assert(D.GENRES[r.genre]); for (const m of r.moods) assert(D.MOODS[m], 'mood ' + m); }

E.setRandom(D.rng(12345));
const store = { m: {}, setItem(k, v) { this.m[k] = v; }, getItem(k) { return this.m[k]; }, removeItem(k) { delete this.m[k]; } };

function bestFor(S, req) {
  let best = null, bs = -1;
  for (const it of S.stock) { if (S.wall.includes(it.uid)) continue; const s = E.matchScore(req, E.recOf(it)); if (s > bs) { bs = s; best = it; } }
  return { best, bs };
}

function playRun(skill, days) {
  const S = E.newGame();
  let over = false, perfect = 0, offers = 0, thieves = 0;
  for (let d = 0; d < days && !over; d++) {
    assert.strictEqual(S.phase, 'morning');
    const lots = S.lots.filter(l => l.cost <= S.cash * 0.6).sort((a, b) => b.cost - a.cost);
    if (lots.length) { const dig = E.buyLot(S, lots[0].id); assert(dig && dig.items.length === lots[0].n); }
    E.openShop(S);
    let guard = 0;
    while (!S.today.closed && guard++ < 20000) {
      const ev = E.step(S, 0.1);
      for (const e of ev) if (e.t === 'thief') { thieves++; if (Math.random() < skill) E.catchThief(S, e.cid); }
      const c = E.front(S);
      if (c && c.state === 'queue' && c.patience < c.maxPat - 3) {
        if (c.kind === 'seller') { if (c.ask < E.valueOf(c.offer) * 0.7) E.buyFromSeller(S); else E.sendAway(S); }
        else if (c.kind !== 'thief') {
          const { best, bs } = bestFor(S, c.req);
          if (best && bs >= 0.55 && Math.random() < skill) { const r = E.offer(S, best.uid); offers++; if (r.perfect) perfect++; if (r.haggle) E.haggle(S, Math.random() < 0.5); }
          else E.sendAway(S);
        }
      } else if (c && c.state === 'haggle') E.haggle(S, false);
    }
    assert(guard < 20000, 'day ended');
    const sum = E.closeShop(S);
    assert(sum.rating > 0 && sum.rating <= 5);
    if (sum.rentDue) { const r = E.payRent(S); if (r.over) over = true; }
    for (const u of D.UPGRADES) if (S.cash > 400 && E.upgradeCost(S, u.id) && E.upgradeCost(S, u.id) < S.cash * 0.3) E.buyUpgrade(S, u.id);
    if (S.up.wall && S.wall.length < E.wallSlots(S)) { const r = S.stock.find(x => E.recOf(x).rarity === 'L' && !S.wall.includes(x.uid)); if (r) E.toggleWall(S, r.uid); }
    assert(S.stock.length <= E.stockCap(S), 'stock within cap');
    assert(S.cash >= 0, 'cash never negative');
    if (!over) E.nextDay(S);
  }
  E.save(S, store); const L = E.load(store); assert.strictEqual(L.day, S.day);
  return { S, over, perfect, offers, thieves };
}

const good = playRun(0.95, 42);
const bad = playRun(0.15, 42);
const fmt = r => `day ${r.S.day}, level ${r.S.level}, cash £${r.S.cash}, sold ${r.S.stats.sold}, perfect ${r.perfect}/${r.offers}, best combo ${r.S.stats.bestCombo}, found ${Object.keys(r.S.found).length}/${D.CATALOGUE.length}, regulars ${Object.values(r.S.regs).map(x => x.hearts).join('')}, strikes ${r.S.strikes}${r.over ? ' (closed down)' : ''}`;
console.log('skilled bot:   ' + fmt(good));
console.log('careless bot:  ' + fmt(bad));
assert(!good.over, 'a good player should survive six weeks');
assert(good.S.level >= 5, 'a good player should level up');
assert(bad.over || bad.S.cash < good.S.cash, 'skill should matter');
console.log('all tests passed');
