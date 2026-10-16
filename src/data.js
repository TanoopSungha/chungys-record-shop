// Chungy's Record Shop: game data. Every artist, album and character here is made up.
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
    rock:    { name: 'Rock', unlock: 1, col: '#e5483b', alt: '#ffd447', bpm: 128, moods: ['loud', 'party', 'uplifting'],
      clues: ['proper guitars, none of that computer stuff', 'something to play air guitar to', 'big riffs, big choruses', 'the kind of thing my dad played in the car'] },
    punk:    { name: 'Punk', unlock: 1, col: '#ff3fa4', alt: '#f6f046', bpm: 170, moods: ['loud', 'weird', 'dark'],
      clues: ['three chords and an attitude', 'fast, shouty, under two minutes a song', 'something to annoy my landlord', 'safety pins and spit'] },
    soul:    { name: 'Soul', unlock: 1, col: '#f28c28', alt: '#7a2e1f', bpm: 92, moods: ['romantic', 'sad', 'uplifting'],
      clues: ['a voice that could break your heart', 'horns, strings, real feeling', 'Sunday morning, kettle on', 'something my nan danced to'] },
    hiphop:  { name: 'Hip-Hop', unlock: 1, col: '#2f9bff', alt: '#ffb800', bpm: 90, moods: ['party', 'dark', 'chill'],
      clues: ['beats and rhymes, boom-bap', 'something to nod my head to', 'breaks I can sample', 'bars, proper bars'] },
    reggae:  { name: 'Reggae', unlock: 1, col: '#2fb35a', alt: '#ffd000', bpm: 76, moods: ['chill', 'uplifting', 'party'],
      clues: ['sunshine and a bit of bass', 'something for the barbecue', 'off-beat guitar, big bassline', 'roots, rock, the good stuff'] },
    metal:   { name: 'Metal', unlock: 2, col: '#8e9bb0', alt: '#c3001b', bpm: 150, moods: ['loud', 'dark', 'weird'],
      clues: ['make my neighbours move house', 'heavier than a skip full of bricks', 'double kick drums, please', 'something to headbang to'] },
    jazz:    { name: 'Jazz', unlock: 3, col: '#3557c9', alt: '#f4efe1', bpm: 112, moods: ['chill', 'romantic', 'weird'],
      clues: ['smoky, late at night, saxophone', 'something with a walking bassline', 'cool cats only', 'the sound of a basement club'] },
    house:   { name: 'House', unlock: 4, col: '#b14bff', alt: '#39f0d0', bpm: 124, moods: ['party', 'uplifting', 'chill'],
      clues: ['four to the floor till sunrise', 'something for the warehouse', 'a piano stab and a big drop', 'for when the sun comes up at the festival'] },
    disco:   { name: 'Disco', unlock: 5, col: '#ffcf3f', alt: '#ff5fa2', bpm: 118, moods: ['party', 'romantic', 'uplifting'],
      clues: ['glitterball energy', 'strings, hi-hats and flares', 'roller-disco night', 'something to strut to'] },
    folk:    { name: 'Folk', unlock: 6, col: '#a7783f', alt: '#e8dcc0', bpm: 100, moods: ['sad', 'chill', 'romantic'],
      clues: ['acoustic, round a campfire', 'a fiddle and a story', 'something for a long walk in the hills', 'songs about the sea'] },
  };
  const GENRE_IDS = Object.keys(GENRES);

  const MOODS = {
    loud: ['loud', 'LOUD', 'that rattles the windows'],
    chill: ['to chill to', 'for a lazy afternoon', 'nice and mellow'],
    sad: ['for a good cry', 'a bit heartbroken', 'for a rainy day'],
    party: ['for a party', 'to get people dancing', 'for Saturday night'],
    romantic: ['for a date night', 'a bit romantic', 'to impress someone special'],
    uplifting: ['to cheer me up', 'feel-good', 'something happy'],
    dark: ['dark and moody', 'a bit gloomy', 'for midnight'],
    weird: ['properly weird', 'something odd', 'that nobody else has heard of'],
  };
  const ERAS = ['60s', '70s', '80s', '90s', '00s'];
  const ERA_TALK = { '60s': 'from the sixties', '70s': 'from the seventies', '80s': 'from the eighties', '90s': 'from the nineties', '00s': 'from the noughties' };

  const RARITY = {
    C: { name: 'Common', mult: 1, col: '#c9c2b3', w: 70 },
    U: { name: 'Uncommon', mult: 2.2, col: '#53c46b', w: 22 },
    R: { name: 'Rare', mult: 5, col: '#3fa9ff', w: 7 },
    L: { name: 'Legendary', mult: 14, col: '#ffcc33', w: 1 },
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
    { id: 'M', name: 'Mint', mult: 1.6, w: 4 },
    { id: 'NM', name: 'Near Mint', mult: 1.3, w: 14 },
    { id: 'VG+', name: 'Very Good +', mult: 1.0, w: 34 },
    { id: 'VG', name: 'Very Good', mult: 0.8, w: 30 },
    { id: 'G', name: 'Good (crackly)', mult: 0.5, w: 18 },
  ];

  // ---------- dig lots (morning crate buying) ----------
  const LOTS = [
    { id: 'charity', name: 'Charity shop bin', blurb: 'Cheap and cheerful. Mostly easy listening, the odd surprise.', cost: 15, n: 5, luck: 0.6, minLevel: 1 },
    { id: 'carboot', name: 'Car boot sale crate', blurb: 'A man called Dave wants it gone by ten.', cost: 30, n: 7, luck: 1, minLevel: 1 },
    { id: 'loft', name: 'Loft clearance', blurb: 'A whole loft of records, smells of dust and history.', cost: 55, n: 10, luck: 1.25, minLevel: 2 },
    { id: 'dj', name: 'Retired DJ\'s boxes', blurb: 'Thirty years of club nights. Expect bangers.', cost: 90, n: 10, luck: 1.8, minLevel: 3, bias: ['house', 'hiphop', 'disco', 'reggae'] },
    { id: 'mystery', name: 'Sealed mystery crate', blurb: 'Taped shut. Could be junk. Could be treasure.', cost: 45, n: 6, luck: 2.4, minLevel: 2, mystery: true },
    { id: 'estate', name: 'Collector\'s estate sale', blurb: 'A lifetime collection. Premium prices, premium finds.', cost: 160, n: 12, luck: 3, minLevel: 5, van: true },
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
    { id: 'beryl', name: 'Nan Beryl', unlock: 1, likes: ['soul'], moods: ['romantic', 'uplifting'], look: { skin: '#f6d3b3', hair: 'bun', hairCol: '#f2f2f2', top: 'cardigan', col: '#c76b9b', acc: 'glasses', build: 0.9, h: 0.88 },
      lines: ['Ooh, hello love! I danced to this at the Palais in \'64.', 'My Stan proposed to me during a soul record. Bless him.', 'I\'ve brought you a slice of lemon drizzle. Don\'t tell the doctor.', 'You\'ve got a good ear, young man. Like my Stan.', 'I\'m telling everyone at bingo about this shop!'],
      perk: { id: 'cake', name: 'Nan\'s Lemon Drizzle', desc: 'Every customer waits 15% longer (cake on the counter).' } },
    { id: 'kwesi', name: 'DJ Kwesi', unlock: 1, likes: ['hiphop', 'house'], moods: ['party'], look: { skin: '#5f3a22', hair: 'cap', hairCol: '#1c1410', top: 'hoodie', col: '#2f9bff', acc: 'headphones', build: 1, h: 1.02 },
      lines: ['Yo Chungy! Need breaks for Friday\'s set.', 'That last one? Absolute scenes. The crowd lost it.', 'Thinking about doing a set in here one Saturday...', 'Respect. Your crates are getting serious.', 'Saturdays are mine now. I\'ll bring the crowd.'],
      perk: { id: 'djset', name: 'Kwesi\'s Saturday Sets', desc: 'Saturdays bring 50% more customers.' } },
    { id: 'gemma', name: 'Gemma Grave', unlock: 1, likes: ['punk', 'metal'], moods: ['dark', 'loud'], look: { skin: '#ffd9c2', hair: 'bob', hairCol: '#111', top: 'leather', col: '#111', acc: 'piercing', build: 0.85, h: 0.96 },
      lines: ['...is it dark? It had better be dark.', 'Fine. That was acceptable. Barely.', 'My band played our first gig. Eleven people came. Amazing.', 'I told my coven about you. They\'re very nice, actually.', 'You\'re alright, Chungy. Don\'t tell anyone I said that.'],
      perk: { id: 'goths', name: 'The Coven', desc: 'Punk and metal fans tip double.' } },
    { id: 'terry', name: 'Big Terry', unlock: 2, likes: ['metal', 'rock'], moods: ['loud'], look: { skin: '#eebd94', hair: 'long', hairCol: '#3b2414', top: 'leather', col: '#222', acc: 'beard', build: 1.35, h: 1.1 },
      lines: ['LOUDER. Always louder.', 'My Harley and my cat. And metal. That\'s all I need.', 'Someone nicked a record? Point me at them.', 'You\'re a good lad. My cat would like you.', 'Nobody\'s nicking from this shop while I\'m about.'],
      perk: { id: 'bouncer', name: 'Terry on the Door', desc: 'Shoplifters get caught automatically.' } },
    { id: 'okafor', name: 'Professor Okafor', unlock: 3, likes: ['jazz', 'soul'], moods: ['chill', 'weird'], look: { skin: '#8d5a36', hair: 'beret', hairCol: '#9a9a9a', top: 'turtleneck', col: '#1f2b5c', acc: 'glasses', build: 1, h: 1 },
      lines: ['Ah. A modal approach, I see. Delightful.', 'Did you know this was recorded in a single take?', 'I lecture on this, you know. My students are hopeless.', 'You have the instincts of a true archivist.', 'Here, my old price guide. You\'ll make better use of it.'],
      perk: { id: 'guide', name: 'The Professor\'s Price Guide', desc: 'See the exact value and rarity of records before you buy a lot.' } },
    { id: 'pip', name: 'Little Pip', unlock: 2, likes: ['disco', 'house', 'rock'], moods: ['uplifting', 'party'], look: { skin: '#d9a06f', hair: 'curly', hairCol: '#b5752f', top: 'tee', col: '#ffcf3f', acc: 'none', build: 0.8, h: 0.68 },
      lines: ['I saved up all my pocket money! It\'s £4 and a button.', 'My mum says vinyl is "a phase". It\'s NOT.', 'I drew you a picture of the shop! The cat is the best bit.', 'When I grow up I want a record shop like yours!', 'I made you a new sign! It\'s got glitter on it.'],
      perk: { id: 'sign', name: 'Pip\'s Glitter Sign', desc: 'Your shop rating gets a permanent half-star boost.' } },
    { id: 'rosa', name: 'Rosa Delgado', unlock: 4, likes: ['disco', 'reggae'], moods: ['party', 'romantic'], look: { skin: '#b97a4e', hair: 'afro', hairCol: '#1c1410', top: 'sequin', col: '#ff5fa2', acc: 'earrings', build: 1, h: 1 },
      lines: ['Darling! Something to make the hips move!', 'I run the roller-disco on Thursdays, you must come.', 'You know, you dance like nobody\'s watching. Because nobody is.', 'Everybody at the rink asks where I get my records.', 'Party records here sell like hot cakes now, darling.'],
      perk: { id: 'dancefloor', name: 'Rosa\'s Dancefloor', desc: 'Party records sell for 25% more.' } },
  ];

  // ---------- upgrades (each one appears in the shop scene) ----------
  const UPGRADES = [
    { id: 'rack', name: 'Extra record rack', icon: '🗄️', levels: [60, 140, 300, 600], desc: 'Hold more stock. Racks: 16, then 24, 34, 46, 60 records.', cap: [16, 24, 34, 46, 60] },
    { id: 'booth', name: 'Listening booth', icon: '🎧', levels: [120], desc: 'Customers wait 25% longer: they\'re having a listen.' },
    { id: 'speakers', name: 'Big speakers', icon: '🔊', levels: [90, 260], desc: 'The record on your turntable pulls in more fans of that genre, and they tip more.' },
    { id: 'neon', name: 'Neon sign', icon: '💡', levels: [150, 400], desc: 'More people notice the shop: +20% customers per level.' },
    { id: 'cat', name: 'Shop cat (Wax)', icon: '🐈', levels: [80], desc: 'Wax wanders the shop. Click Wax to calm everyone down, once a day.' },
    { id: 'coffee', name: 'Coffee corner', icon: '☕', levels: [110], desc: 'Every customer buys a coffee: +£2 each, sale or no sale.' },
    { id: 'wall', name: 'Wall of Fame frames', icon: '🖼️', levels: [70, 180, 420], desc: 'Frame rare records on the wall. Each framed record boosts your rating and pulls in its fans.', slots: [2, 4, 6, 8] },
    { id: 'van', name: 'Chungy\'s van', icon: '🚐', levels: [350], desc: 'Drive out to estate sales: the best crates in the county.' },
    { id: 'torch', name: 'Crate-digger\'s torch', icon: '🔦', levels: [100, 300], desc: 'Spot the good stuff: better odds of rare records in every lot.' },
  ];

  // ---------- rent (the landlord, Mr Grimsby) ----------
  const RENT = [120, 220, 360, 520, 700, 920, 1180, 1480, 1820, 2200];
  const rentFor = week => week <= RENT.length ? RENT[week - 1] : Math.round(2200 + (week - RENT.length) * 450);

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // ---------- daily goals ----------
  const GOALS = [
    { id: 'perfect', text: n => `Make ${n} perfect matches`, n: [3, 5, 7], reward: 30 },
    { id: 'combo', text: n => `Reach a ${n}x combo`, n: [3, 5, 8], reward: 40 },
    { id: 'earn', text: n => `Take £${n} in one day`, n: [80, 150, 260, 400], reward: 35 },
    { id: 'genre', text: (n, g) => `Sell ${n} ${GENRES[g].name} records`, n: [2, 3, 4], reward: 30, genre: true },
    { id: 'regular', text: n => `Make ${n} regulars happy`, n: [1, 2], reward: 35 },
    { id: 'rare', text: n => `Sell a Rare or better record`, n: [1], reward: 45 },
    { id: 'buyin', text: n => `Buy ${n} records over the counter`, n: [1, 2], reward: 25 },
  ];

  G.CRS_DATA = { rng, hash, pick, GENRES, GENRE_IDS, MOODS, ERAS, ERA_TALK, RARITY, GRADES, CATALOGUE, BY_ID, LOTS, SKIN, HAIRCOL, TRIBES, NAMES, REGULARS, UPGRADES, rentFor, DAYS, GOALS };
})(typeof window !== 'undefined' ? window : globalThis);
