// Chungy's Record Shop: game data. Every artist, album and character here is made up.
// Player-facing text (moods, clues, lots, upgrades, regulars' lines...) lives in i18n/<lang>.js.
(function (G) {
  'use strict';

  // ---------- seeded random ----------
  function rng(seed) {
    let s = (typeof seed === 'string' ? hash(seed) : seed >>> 0) || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  // ---------- genres ----------
  // unlock: the shop level at which customers start asking for it and digs start turning it up.
  const GENRES = {
    rock:    { name: 'Rock', unlock: 1, col: '#e5483b', alt: '#ffd447', bpm: 128, moods: ['loud', 'party', 'uplifting'], clues: 4 },
    punk:    { name: 'Punk', unlock: 1, col: '#ff3fa4', alt: '#f6f046', bpm: 170, moods: ['loud', 'weird', 'dark'], clues: 4 },
    soul:    { name: 'Soul', unlock: 1, col: '#f28c28', alt: '#7a2e1f', bpm: 92, moods: ['romantic', 'sad', 'uplifting'], clues: 4 },
    hiphop:  { name: 'Hip-Hop', unlock: 1, col: '#2f9bff', alt: '#ffb800', bpm: 90, moods: ['party', 'dark', 'chill'], clues: 4 },
    reggae:  { name: 'Reggae', unlock: 1, col: '#2fb35a', alt: '#ffd000', bpm: 76, moods: ['chill', 'uplifting', 'party'], clues: 4 },
    metal:   { name: 'Metal', unlock: 2, col: '#8e9bb0', alt: '#c3001b', bpm: 150, moods: ['loud', 'dark', 'weird'], clues: 4 },
    jazz:    { name: 'Jazz', unlock: 3, col: '#3557c9', alt: '#f4efe1', bpm: 112, moods: ['chill', 'romantic', 'weird'], clues: 4 },
    house:   { name: 'House', unlock: 4, col: '#b14bff', alt: '#39f0d0', bpm: 124, moods: ['party', 'uplifting', 'chill'], clues: 4 },
    disco:   { name: 'Disco', unlock: 5, col: '#ffcf3f', alt: '#ff5fa2', bpm: 118, moods: ['party', 'romantic', 'uplifting'], clues: 4 },
    folk:    { name: 'Folk', unlock: 6, col: '#a7783f', alt: '#e8dcc0', bpm: 100, moods: ['sad', 'chill', 'romantic'], clues: 4 },
  };
  const GENRE_IDS = Object.keys(GENRES);

  // Each mood has three ways customers say it (text in i18n: mood.<id>.0-2).
  const MOODS = { loud: 3, chill: 3, sad: 3, party: 3, romantic: 3, uplifting: 3, dark: 3, weird: 3 };
  const ERAS = ['60s', '70s', '80s', '90s', '00s'];

  const RARITY = {
    C: { mult: 1, col: '#c9c2b3', w: 70 },
    U: { mult: 2.2, col: '#53c46b', w: 22 },
    R: { mult: 5, col: '#3fa9ff', w: 7 },
    L: { mult: 14, col: '#ffcc33', w: 1 },
  };

  // ---------- name generators ----------
  const W = {
    rock: { a: ['Velvet', 'Iron', 'Electric', 'Midnight', 'Crimson', 'Rolling', 'Wild', 'Static'], n: ['Pylons', 'Foxes', 'Engines', 'Wolves', 'Satellites', 'Highways', 'Tigers', 'Rivals'], t: ['Concrete Lullabies', 'Highway Fever', 'Born Under Neon', 'Loud Is Beautiful', 'Thunder in Leeds', 'Gasoline Hearts', 'Back of the Van', 'Amplifier Love'] },
    punk: { a: ['Rotten', 'Angry', 'Sick', 'Broken', 'Nasty', 'Toxic', 'Spiky', 'Bored'], n: ['Pigeons', 'Teeth', 'Scabs', 'Rats', 'Kettles', 'Bin Lids', 'Gobs', 'Pins'], t: ['No Future, No Fuss', 'Council Estate Riot', 'Two Minute Warning', 'Spit & Polish', 'Anarchy in Aldi', 'Smash It Up Again', 'Dole Queue Disco', 'Safety Pin Sonnets'] },
    soul: { a: ['Sweet', 'Golden', 'Velvet', 'Smooth', 'Honey', 'Mellow'], n: ['Sensations', 'Impressions', 'Delights', 'Satins', 'Tempests', 'Harmonies'], t: ['Hold On to Tonight', 'Sugar in My Tea', 'Heart Full of Rain', 'Ain\'t No Sunshine Like You', 'Back to Your Love', 'Tears on the Dancefloor', 'Silk & Thunder', 'Sunday Kind of Soul'] },
    hiphop: { a: ['Lyrical', 'Concrete', 'Golden', 'Midnight', 'Block', 'Boombox'], n: ['Prophets', 'Scholars', 'Crew', 'Collective', 'Architects', 'Kings'], t: ['Bars for Days', 'Breaks & Bricks', 'The Boom-Bap Tapes', 'Crate Science', 'Mic Check Manifesto', 'Concrete Poetry', 'Tape Deck Diaries', 'From the Block Up'] },
    reggae: { a: ['Roots', 'Sunshine', 'Dub', 'Lion', 'Island', 'Steady'], n: ['Rockers', 'Messengers', 'Warriors', 'Sound System', 'Vibrations', 'Disciples'], t: ['One Love Avenue', 'Sound System Sunday', 'Dub from the Bottom', 'Sunshine Riddim', 'Skank on the Corner', 'Roots Rock Revival', 'Babylon Bus Stop', 'Bassline Kingdom'] },
    metal: { a: ['Black', 'Grave', 'Iron', 'Doom', 'Steel', 'Thunder'], n: ['Coffin', 'Hammer', 'Abyss', 'Serpent', 'Wolfskull', 'Anvil'], t: ['Riders of the Ring Road', 'Doom Over Dudley', 'Skullcrusher Symphony', 'Altar of Volume', 'Molten Thrones', 'Ride the Thunderbeast', 'Forged in Wolverhampton', 'Graveyard Gig'] },
    jazz: { a: ['Blue', 'Cool', 'Smoky', 'Late', 'Velvet', 'Modal'], n: ['Quartet', 'Trio', 'Ensemble', 'Orchestra', 'Five', 'Sextet'], t: ['Basement Blue', 'Moonlight on Soho', 'Walking Bass Walk', 'Smoke Rings', 'Kind of Late', 'The Cool Hour', 'A Night at the Copper Lamp', 'Bebop for Breakfast'] },
    house: { a: ['Deep', 'Acid', 'Warehouse', 'Sunrise', 'Strobe', 'Club'], n: ['Theory', 'Unit', 'Project', 'Society', 'Machine', 'Dept.'], t: ['Four to the Floor', 'Warehouse Gospel', 'Sunrise in the Car Park', 'Jack Your Body Clock', 'Piano Hands Up', 'Strobe Light Sermon', 'The 6am Track', 'Bassline Baptism'] },
    disco: { a: ['Glitter', 'Satin', 'Roller', 'Starlight', 'Funky', 'Sparkle'], n: ['Stars', 'Sisters', 'Machine', 'Express', 'Brigade', 'Explosion'], t: ['Glitterball Fever', 'Roller Boogie Nights', 'Strut Your Stuff', 'Dancefloor Royalty', 'Funky Town Hall', 'Hustle at the Palais', 'Mirrorball Heart', 'Saturday Satin'] },
    folk: { a: ['Hollow', 'Willow', 'Wandering', 'Old', 'Green', 'Misty'], n: ['Fiddlers', 'Shanties', 'Hedgerows', 'Ramblers', 'Harvesters', 'Lanterns'], t: ['Songs of the Salt Road', 'Ballad of the Brambles', 'Lantern on the Moor', 'The Ferryman\'s Daughter', 'Hedgerow Hymns', 'Ale & Autumn', 'Down by the Weir', 'Fiddle & Fog'] },
  };
  const FIRST = ['Marvin', 'Delia', 'Tony', 'Shirley', 'Kofi', 'Ruby', 'Lenny', 'Mavis', 'Desmond', 'Nina', 'Clive', 'Gloria', 'Errol', 'Bev', 'Wes', 'Priya', 'Jojo', 'Sol'];
  const LAST = ['Gold', 'Washington', 'Brown', 'Diamond', 'Mensah', 'Fox', 'Starr', 'Boateng', 'Silver', 'Lee', 'Okoro', 'Cole', 'Jackson', 'Bright'];
  const PREFIX = { hiphop: ['MC', 'DJ', 'Lil\'', 'Big'], house: ['DJ', 'Mr.', 'Kid', 'The'], reggae: ['King', 'Lord', 'Sister', 'Brother'], disco: ['Miss', 'Lady', 'Mr.', 'Sir'] };

  function makeArtist(r, g) {
    const w = W[g], k = r();
    if (PREFIX[g] && k < 0.35) return pick(r, PREFIX[g]) + ' ' + pick(r, LAST);
    if (k < 0.55) return pick(r, FIRST) + ' ' + pick(r, LAST) + (r() < 0.4 ? ' & the ' + pick(r, w.n) : '');
    return (r() < 0.6 ? 'The ' : '') + pick(r, w.a) + ' ' + pick(r, w.n);
  }

  // ---------- the catalogue: every record that exists in this world ----------
  const LEGENDS = [
    { g: 'rock', artist: 'The Velvet Pylons', title: 'Electric Cathedral (first press)', era: '70s', moods: ['loud', 'uplifting'] },
    { g: 'punk', artist: 'The Rotten Pigeons', title: 'Never Mind the Bin Lids', era: '70s', moods: ['loud', 'weird'] },
    { g: 'soul', artist: 'Mavis Diamond', title: 'Honey on the Moon', era: '60s', moods: ['romantic', 'sad'] },
    { g: 'hiphop', artist: 'Lyrical Prophets', title: 'The Lost Tape (white label)', era: '90s', moods: ['dark', 'party'] },
    { g: 'reggae', artist: 'King Mensah', title: 'Dub Cathedral', era: '70s', moods: ['chill', 'uplifting'] },
    { g: 'metal', artist: 'Doom Coffin', title: 'Thunderbeast Rising (red vinyl)', era: '80s', moods: ['loud', 'dark'] },
    { g: 'jazz', artist: 'The Smoky Quartet', title: 'Live at the Copper Lamp, 1961', era: '60s', moods: ['chill', 'romantic'] },
    { g: 'house', artist: 'Deep Theory', title: 'Warehouse Gospel (test press)', era: '90s', moods: ['party', 'uplifting'] },
    { g: 'disco', artist: 'The Glitter Sisters', title: 'Mirrorball Heart (12" mix)', era: '70s', moods: ['party', 'romantic'] },
    { g: 'folk', artist: 'The Willow Fiddlers', title: 'Lantern on the Moor (signed)', era: '60s', moods: ['sad', 'chill'] },
  ];

  function buildCatalogue() {
    const out = [];
    const r = rng('chungy-catalogue-v1');
    for (const g of GENRE_IDS) {
      const gm = GENRES[g].moods, used = new Set();
      for (let i = 0; i < 13; i++) {
        let artist, title, tries = 0;
        do { artist = makeArtist(r, g); title = pick(r, W[g].t); tries++; } while (used.has(title + artist) && tries < 20);
        used.add(title + artist);
        const rar = i < 6 ? 'C' : i < 10 ? 'U' : 'R';
        const m1 = pick(r, gm); let m2 = pick(r, Object.keys(MOODS)); if (m2 === m1) m2 = gm.find(m => m !== m1);
        const eraIx = Math.min(ERAS.length - 1, Math.floor(r() * ERAS.length));
        out.push({ id: g + '-' + i, genre: g, artist, title, era: ERAS[eraIx], moods: [m1, m2], rarity: rar, seed: Math.floor(r() * 1e9) });
      }
    }
    LEGENDS.forEach((L, i) => out.push({ id: L.g + '-L', genre: L.g, artist: L.artist, title: L.title, era: L.era, moods: L.moods, rarity: 'L', seed: 777 + i * 131 }));
    for (const rec of out) rec.base = Math.round((6 + (hash(rec.id) % 7)) * RARITY[rec.rarity].mult);
    return out;
  }
  const CATALOGUE = buildCatalogue();
  const BY_ID = Object.fromEntries(CATALOGUE.map(r => [r.id, r]));

  // ---------- condition grades (real record-shop grading) ----------
  const GRADES = [
    { id: 'M', mult: 1.6, w: 4 },
    { id: 'NM', mult: 1.3, w: 14 },
    { id: 'VG+', mult: 1.0, w: 34 },
    { id: 'VG', mult: 0.8, w: 30 },
    { id: 'G', mult: 0.5, w: 18 },
  ];

  // ---------- dig lots (morning crate buying) ----------
  const LOTS = [
    { id: 'charity', cost: 15, n: 5, luck: 0.6, minLevel: 1 },
    { id: 'carboot', cost: 30, n: 7, luck: 1, minLevel: 1 },
    { id: 'loft', cost: 55, n: 10, luck: 1.25, minLevel: 2 },
    { id: 'dj', cost: 90, n: 10, luck: 1.8, minLevel: 3, bias: ['house', 'hiphop', 'disco', 'reggae'] },
    { id: 'mystery', cost: 45, n: 6, luck: 2.4, minLevel: 2, mystery: true },
    { id: 'estate', cost: 160, n: 12, luck: 3, minLevel: 5, van: true },
  ];

  // ---------- customer looks ----------
  const SKIN = ['#f6d3b3', '#eebd94', '#d9a06f', '#b97a4e', '#8d5a36', '#5f3a22', '#ffd9c2'];
  const HAIRCOL = ['#1c1410', '#3b2414', '#6b3d1f', '#b5752f', '#e8c46a', '#d84a2c', '#9a9a9a', '#f2f2f2'];
  // Each genre has a "tribe" so you can read a customer before they speak.
  const TRIBES = {
    rock:   { hair: ['quiff', 'long', 'shaggy'], top: ['tee', 'denim'], cols: ['#e5483b', '#2b3a67', '#222'], acc: ['none', 'shades'] },
    punk:   { hair: ['mohawk', 'spiky'], top: ['leather'], cols: ['#111', '#ff3fa4'], hairCol: ['#ff3fa4', '#4cf05b', '#2fb6ff', '#f6f046'], acc: ['piercing', 'chain'] },
    soul:   { hair: ['afro', 'bun', 'curly'], top: ['shirt', 'cardigan'], cols: ['#f28c28', '#7a2e1f', '#d9b25e'], acc: ['earrings', 'none'] },
    hiphop: { hair: ['cap', 'braids', 'short'], top: ['hoodie', 'tee'], cols: ['#2f9bff', '#ffb800', '#e23b3b', '#222'], acc: ['chain', 'headphones'] },
    reggae: { hair: ['tam', 'locs'], top: ['tee', 'shirt'], cols: ['#2fb35a', '#ffd000', '#d12d2d'], acc: ['none', 'shades'] },
    metal:  { hair: ['long', 'bald'], top: ['tee', 'leather'], cols: ['#111', '#222', '#3a3a3a'], acc: ['beard', 'chain'] },
    jazz:   { hair: ['beret', 'short', 'bun'], top: ['turtleneck', 'suit'], cols: ['#1f2b5c', '#f4efe1', '#3a2a20'], acc: ['glasses', 'none'] },
    house:  { hair: ['buckethat', 'short', 'bob'], top: ['tee', 'hoodie'], cols: ['#b14bff', '#39f0d0', '#ff7a2e'], acc: ['headphones', 'shades'] },
    disco:  { hair: ['afro', 'long', 'curly'], top: ['shirt', 'sequin'], cols: ['#ffcf3f', '#ff5fa2', '#f4f4f4'], acc: ['shades', 'earrings'] },
    folk:   { hair: ['shaggy', 'bun', 'beanie'], top: ['cardigan', 'shirt'], cols: ['#6b8f45', '#a7783f', '#c9b48a'], acc: ['beard', 'glasses'] },
  };

  const NAMES = ['Alfie', 'Ava', 'Bilal', 'Chloe', 'Dev', 'Ellie', 'Femi', 'Grace', 'Harry', 'Isla', 'Jay', 'Kemi', 'Liam', 'Maya', 'Nish', 'Olly', 'Poppy', 'Raj', 'Sian', 'Theo', 'Uma', 'Vic', 'Wren', 'Yusuf', 'Zara', 'Callum', 'Leah', 'Tariq', 'Becca', 'Mo'];

  // ---------- regulars: named characters with their own stories ----------
  const REGULARS = [
    { id: 'beryl', name: 'Nan Beryl', unlock: 1, likes: ['soul'], moods: ['romantic', 'uplifting'], look: { skin: '#f6d3b3', hair: 'bun', hairCol: '#f2f2f2', top: 'cardigan', col: '#c76b9b', acc: 'glasses', build: 0.9, h: 0.88, eyes: '#5d8aa8', lashes: true, lips: '#d47088' },
      perk: { id: 'cake' } },
    { id: 'kwesi', name: 'DJ Kwesi', unlock: 1, likes: ['hiphop', 'house'], moods: ['party'], look: { skin: '#5f3a22', hair: 'cap', hairCol: '#1c1410', top: 'hoodie', col: '#2f9bff', acc: 'headphones', build: 1, h: 1.02, eyes: '#3b2414' },
      perk: { id: 'djset' } },
    { id: 'gemma', name: 'Gemma Grave', unlock: 1, likes: ['punk', 'metal'], moods: ['dark', 'loud'], look: { skin: '#ffd9c2', hair: 'bob', hairCol: '#111', top: 'leather', col: '#111', acc: 'piercing', build: 0.85, h: 0.96, eyes: '#4e8c6f', lashes: true, lips: '#4a152b' },
      perk: { id: 'goths' } },
    { id: 'terry', name: 'Big Terry', unlock: 2, likes: ['metal', 'rock'], moods: ['loud'], look: { skin: '#eebd94', hair: 'long', hairCol: '#3b2414', top: 'leather', col: '#222', acc: 'beard', build: 1.35, h: 1.1, eyes: '#5a7a9a' },
      perk: { id: 'bouncer' } },
    { id: 'okafor', name: 'Professor Okafor', unlock: 3, likes: ['jazz', 'soul'], moods: ['chill', 'weird'], look: { skin: '#8d5a36', hair: 'beret', hairCol: '#9a9a9a', top: 'turtleneck', col: '#1f2b5c', acc: 'glasses', build: 1, h: 1, eyes: '#3b2414' },
      perk: { id: 'guide' } },
    { id: 'pip', name: 'Little Pip', unlock: 2, likes: ['disco', 'house', 'rock'], moods: ['uplifting', 'party'], look: { skin: '#d9a06f', hair: 'curly', hairCol: '#b5752f', top: 'tee', col: '#ffcf3f', acc: 'none', build: 0.8, h: 0.68, eyes: '#7a5230', lashes: true },
      perk: { id: 'sign' } },
    { id: 'rosa', name: 'Rosa Delgado', unlock: 4, likes: ['disco', 'reggae'], moods: ['party', 'romantic'], look: { skin: '#b97a4e', hair: 'afro', hairCol: '#1c1410', top: 'sequin', col: '#ff5fa2', acc: 'earrings', build: 1, h: 1, eyes: '#5c3c20', lashes: true, lips: '#e03c68' },
      perk: { id: 'dancefloor' } },
  ];

  // ---------- upgrades (each one appears in the shop scene) ----------
  const UPGRADES = [
    { id: 'rack', icon: '🗄️', levels: [60, 140, 300, 600], cap: [16, 24, 34, 46, 60] },
    { id: 'booth', icon: '🎧', levels: [120] },
    { id: 'speakers', icon: '🔊', levels: [90, 260] },
    { id: 'neon', icon: '💡', levels: [150, 400] },
    { id: 'cat', icon: '🐈', levels: [80] },
    { id: 'coffee', icon: '☕', levels: [110] },
    { id: 'wall', icon: '🖼️', levels: [70, 180, 420], slots: [2, 4, 6, 8] },
    { id: 'van', icon: '🚐', levels: [350] },
    { id: 'torch', icon: '🔦', levels: [100, 300] },
  ];

  // ---------- rent (the landlord, Mr Grimsby) ----------
  const RENT = [120, 220, 360, 520, 700, 920, 1180, 1480, 1820, 2200];
  const rentFor = week => week <= RENT.length ? RENT[week - 1] : Math.round(2200 + (week - RENT.length) * 450);

  // ---------- daily goals ----------
  const GOALS = [
    { id: 'perfect', n: [3, 5, 7], reward: 30 },
    { id: 'combo', n: [3, 5, 8], reward: 40 },
    { id: 'earn', n: [80, 150, 260, 400], reward: 35 },
    { id: 'genre', n: [2, 3, 4], reward: 30, genre: true },
    { id: 'regular', n: [1, 2], reward: 35 },
    { id: 'rare', n: [1], reward: 45 },
    { id: 'buyin', n: [1, 2], reward: 25 },
  ];

  G.CRS_DATA = { rng, hash, pick, GENRES, GENRE_IDS, MOODS, ERAS, RARITY, GRADES, CATALOGUE, BY_ID, LOTS, SKIN, HAIRCOL, TRIBES, NAMES, REGULARS, UPGRADES, rentFor, GOALS };
})(typeof window !== 'undefined' ? window : globalThis);
