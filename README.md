# koishipro-core.js

WASM wrapper for YGOPro/ocgcore, designed for both Node and browser runtimes.  
Provides a clean TypeScript API around the Emscripten module, replay playback, and
helpers for loading scripts/cards.

## Features
- Load ocgcore WASM (CJS or ESM) and create duels
- TypeScript-friendly wrapper around duel APIs
- Script readers (Map/Zip) for loading Lua scripts
- SQL.js card reader helper
- Replay (YRP/YRP2) playback to raw message streams
- Constants auto-generated from upstream YGOPro sources

## Install
```bash
npm install koishipro-core.js
```

## Quick Start
```ts
import {
  createOcgcoreWrapper,
  ZipReader,
  DirReader,
  createSqljsCardReader,
} from 'koishipro-core.js';
import initSqlJs from 'sql.js';

const wrapper = await createOcgcoreWrapper();

// Provide scripts via zip + local directory fallback (Node only)
const zipBytes = await fetch('/script.zip').then((r) => r.arrayBuffer());
wrapper
  .setScriptReader(await ZipReader(new Uint8Array(zipBytes)), true)
  .setScriptReader(DirReader('./ygopro-scripts'));

// Provide cards via sql.js
const SQL = await initSqlJs();
const db = new SQL.Database(await fetch('/cards.cdb').then((r) => r.arrayBuffer()));
wrapper.setCardReader(createSqljsCardReader(db));

// Optional: log messages from ocgcore (multiple handlers allowed)
wrapper
  .setMessageHandler((_duel, message, type) => {
    console.log(type, message);
  }, true)
  .setMessageHandler((_duel, message, type) => {
    if (type === 1) console.error(message);
  });

const duel = wrapper.createDuel(1234);
duel.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
duel.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });
duel.startDuel(0);

const { raw, status } = duel.process();
console.log(raw, status);

duel.endDuel();
wrapper.finalize();
```

## Replay Playback
`playYrp` replays a `.yrp/.yrp2` file by feeding responses back to ocgcore and
collecting each engine message as `Uint8Array`. You can pass a parsed `YGOProYrp`
instance or raw bytes.

```ts
import { createOcgcoreWrapper, playYrp } from 'koishipro-core.js';
import { YGOProYrp } from 'ygopro-yrp-encode';

const wrapper = await createOcgcoreWrapper();

// ...setScriptReader / setCardReader / setMessageHandler...

const yrpBytes = await fetch('/replay.yrp').then((r) => r.arrayBuffer());
const messages = playYrp(wrapper, new Uint8Array(yrpBytes));
console.log('message count:', messages.length);
```


## API Overview
### Core
- `createOcgcoreWrapper(options?)`  
  Load the ocgcore WASM module and return an `OcgcoreWrapper`.
- `OcgcoreWrapper`  
  Manages the WASM module, script/card/message handlers, and duel creation.  
  Script readers and handlers can be registered multiple times (fallback/fan-out).
- `OcgcoreDuel`  
  Duel lifecycle and core engine calls (`startDuel`, `process`, `setResponse`, etc.).

### Script Readers
- `MapReader(...maps)`  
  Resolve Lua scripts from one or more `Map<string, string | Uint8Array>` with fallback.
- `ZipReader(...zipBytes)`  
  Load all `.lua` files from one or more zips and expose them via `MapReader` (fallback order).
- `DirReader(...dirs)`  
  Node-only directory reader with the same resolution rules (fallback order).

### Replay
- `playYrp(wrapper, yrpOrBytes)`  
  Run a replay and return a list of raw message `Uint8Array`s.  
  Accepts `YGOProYrp` or raw `.yrp/.yrp2` bytes.  
  Throws `Got MSG_RETRY` if a retry is encountered.

### Card Reader
- `createSqljsCardReader(...dbs)`  
  Build a `CardReader` from one or more SQL.js databases.

### Constants
- `OcgcoreCommonConstants`, `OcgcoreScriptConstants`  
  Pre-generated constants from upstream sources.

## Build / Scripts
- `npm run build` – build CJS + ESM + types
- `npm run fetch-ocgcore` – download vendor WASM and JS
- `npm run gen-constants` – regenerate constants from upstream sources

## Notes
- This package ships both CJS and ESM builds.
- WASM binaries are bundled under `dist/vendor`.
