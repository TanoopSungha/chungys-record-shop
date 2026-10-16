# Chungy's Record Shop

A cosy, slightly chaotic record-shop game by **Snoopster Gaming**.

Chungy has a tiny record shop on the high street, a landlord who puts the rent up every week, and a shop cat called Wax. Help him keep the doors open.

## How it plays

- **Morning: dig the crates.** Buy a lot (charity-shop bin, car-boot crate, loft clearance, a retired DJ's boxes, a sealed mystery crate, or an estate sale once you have the van) and flip the records over one by one. Most are common. Some are rare. A few are legendary.
- **Daytime: read the customers.** People walk in, browse, and come to the counter with a request: "three chords and an attitude", "something from the seventies for a date night", "where's your reggae?". Tap the record in your crate that fits best. Genre matters most, then mood, then decade. Their clothes give their taste away: punks look like punks, jazz cats wear berets.
- **Combos and tips.** Perfect matches in a row build a combo and bigger tips. Collectors pay a premium for specific records and you can push them for more, if you dare.
- **The turntable.** Whatever you play in the shop is synthesised live in that genre's style. It pulls in that genre's fans, who wait longer and tip better.
- **Sellers and shoplifters.** People offer you records over the counter. Hooded types try to nick stock: tap them before they reach the door.
- **Regulars.** Nan Beryl, DJ Kwesi, Gemma Grave, Big Terry, Professor Okafor, Little Pip and Rosa Delgado each have their own story. Fill their five hearts and they give you a permanent perk.
- **Evenings.** Spend the takings on upgrades you can see in the shop (racks, listening booth, speakers, neon, the cat, coffee corner, Wall of Fame frames, the van, a crate-digger's torch), fill the Crate Book, frame your best finds and pick a record for the window.
- **Sundays.** Mr Grimsby wants his rent. Miss it twice and the shop closes.

Plus daily goals, levels that unlock new genres (metal, jazz, house, disco, folk) and regulars, Record Store Day, festivals, rainy days and payday Fridays.

## Run it

```
npm install
npm start          # desktop (Electron)
npm test           # headless balance test: a good bot survives, a careless one goes bust
```

Phones and tablets use Capacitor: `npm run mobile:android`, `npm run mobile:ios`. GitHub Actions builds macOS, Windows, Linux, Android and iOS packages on every push.

## Assets

Everything you see and hear is made in code: characters, record sleeves, the shop, the music and the sound effects. The only files are the Snoopster Gaming intro video and two free fonts, Fredoka (SIL Open Font License) and Luckiest Guy (Apache 2.0); their licences are in `src/assets/fonts`. All artists, albums and characters are made up.
