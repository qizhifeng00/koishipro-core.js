# koishipro-core.js

WASM wrapper for YGOPro/ocgcore, designed for both Node and browser runtimes.  
Provides a clean TypeScript API around the Emscripten module, replay playback, and
helpers for loading scripts/cards.

## Features
- Load ocgcore WASM (CJS or ESM) and create duels
- TypeScript-friendly wrapper around duel APIs
- **All query methods and process messages use [`ygopro-msg-encode`](https://github.com/purerosefallen/ygopro-msg-encode) for typed message parsing**
- Script readers (Map/Zip/Dir) for loading Lua scripts
- SQL.js card reader helper
- Replay (YRP/YRP2) playback with step-by-step control
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

const { raw, status, message } = duel.process();
console.log('Raw bytes:', raw);
console.log('Status:', status);
console.log('Parsed message:', message); // YGOProMsgBase instance from ygopro-msg-encode

duel.endDuel();
wrapper.finalize();
```

## Replay Playback

### playYrp (One-shot)
`playYrp` replays a `.yrp/.yrp2` file and returns all messages at once:

```ts
import { createOcgcoreWrapper, playYrp } from 'koishipro-core.js';

const wrapper = await createOcgcoreWrapper();
// ...setScriptReader / setCardReader...

const yrpBytes = await fetch('/replay.yrp').then((r) => r.arrayBuffer());
const messages = playYrp(wrapper, new Uint8Array(yrpBytes));
console.log('Total messages:', messages.length);
```

### playYrpStep (Generator)
`playYrpStep` gives you step-by-step control over replay execution. Use this when you need to:
- Query game state during replay
- Inspect individual messages and their parsed objects
- Control replay execution flow

```ts
import { createOcgcoreWrapper, playYrpStep } from 'koishipro-core.js';
import { YGOProMsgNewTurn } from 'ygopro-msg-encode';

const wrapper = await createOcgcoreWrapper();
// ...setScriptReader / setCardReader...

const yrpBytes = await fetch('/replay.yrp').then((r) => r.arrayBuffer());

for (const { duel, result } of playYrpStep(wrapper, new Uint8Array(yrpBytes))) {
  // Access parsed message (from ygopro-msg-encode)
  if (result.message instanceof YGOProMsgNewTurn) {
    console.log('New turn started!');
    
    // Query game state at this point
    const fieldInfo = duel.queryFieldInfo();
    console.log('Player 0 LP:', fieldInfo.field.players[0].lp);
    
    const mzoneCards = duel.queryFieldCard({
      player: 0,
      location: LOCATION_MZONE,
      queryFlag: QUERY_CODE | QUERY_ATTACK | QUERY_DEFENSE,
    });
    console.log('Monster zone cards:', mzoneCards.cards);
  }
  
  // Access raw bytes if needed
  console.log('Raw message bytes:', result.raw);
}
```


## API Reference

### Core Classes

#### `createOcgcoreWrapper(options?): Promise<OcgcoreWrapper>`
Load the ocgcore WASM module and return an `OcgcoreWrapper`.

**Options:**
- `scriptBufferSize?: number` - Buffer size for script loading (default: 0x100000)
- `logBufferSize?: number` - Buffer size for log messages (default: 1024)

#### `OcgcoreWrapper`
Manages the WASM module, script/card/message handlers, and duel creation.

**Methods:**
- `setScriptReader(reader: ScriptReader, reset?: boolean): this`  
  Register a script reader. Multiple readers are tried in order (fallback).
- `setCardReader(reader: CardReader, reset?: boolean): this`  
  Register a card reader. Multiple readers are tried in order (fallback).
- `setMessageHandler(handler: MessageHandler, reset?: boolean): this`  
  Register a message handler for debug/error messages (fan-out pattern).
- `createDuel(seed: number): OcgcoreDuel`  
  Create a new duel with a single seed.
- `createDuelV2(seedSequence: number[]): OcgcoreDuel`  
  Create a new duel with a seed sequence (YRP2 format).
- `finalize(): void`  
  Clean up all allocated resources. Call this before discarding the wrapper.

#### `OcgcoreDuel`
Represents a single duel instance with full lifecycle management.

**Core Methods:**
- `startDuel(options: number | OcgcoreStartDuelOptions): void`  
  Start the duel with specified options (duel rules, shuffle mode, etc.).
- `process(): OcgcoreProcessResult`  
  Process the next game event. Returns `{ raw: Uint8Array, status: number, message?: YGOProMsgBase }`.  
  **The `message` field contains the parsed message from `ygopro-msg-encode`.**
- `setResponse(response: Uint8Array): void`  
  Provide a response to the engine (player action).
- `setResponseInt(value: number): void`  
  Provide an integer response.
- `endDuel(): void`  
  End the duel and clean up resources.

**Card Management:**
- `newCard(card: OcgcoreNewCardParams): void`  
  Add a card to the duel.
- `newTagCard(card: OcgcoreNewTagCardParams): void`  
  Add a tag duel card.

**Query Methods (All return `ygopro-msg-encode` objects):**
- `queryCard(query: OcgcoreQueryCardParams): OcgcoreCardQueryResult`  
  Query information about a single card.  
  **Returns `{ card: CardQuery | null }` from `ygopro-msg-encode`.**
  
- `queryFieldCard(query: OcgcoreQueryFieldCardParams): OcgcoreFieldCardQueryResult`  
  Query all cards in a location.  
  **Returns `{ cards: CardQuery[] }` from `ygopro-msg-encode`.**
  
- `queryFieldInfo(): OcgcoreFieldInfoResult`  
  Query the entire field state.  
  **Returns `{ field: YGOProMsgReloadField }` from `ygopro-msg-encode`.**
  
- `queryFieldCount(query: OcgcoreQueryFieldCountParams): number`  
  Get the number of cards in a location.

**Player Info:**
- `setPlayerInfo(info: OcgcoreSetPlayerInfoParams): void`  
  Set initial player state (LP, hand size, draw count).

**Script Preloading:**
- `preloadScript(scriptPath: string): void`  
  Preload a Lua script before duel starts.

**Registry (Key-Value Storage):**
- `setRegistryValue(key: string, value: string): void`
- `getRegistryValue(key: string): OcgcoreRegistryValueResult`
- `getRegistryKeys(): OcgcoreRegistryKeysResult`
- `dumpRegistry(): OcgcoreRegistryDumpResult`
- `loadRegistry(input: Uint8Array): void`
- `clearRegistry(): void`

### Script Readers

#### `MapReader(...maps: Map<string, string | Uint8Array>[]): ScriptReader`
Resolve Lua scripts from one or more Maps with fallback order.

```ts
const scripts = new Map([
  ['c12345.lua', 'function c12345.initial_effect(c) end'],
]);
wrapper.setScriptReader(MapReader(scripts));
```

#### `ZipReader(...zipBytes: Uint8Array[]): Promise<ScriptReader>`
Load all `.lua` files from one or more zips.

```ts
const zipBytes = await fetch('/scripts.zip').then(r => r.arrayBuffer());
wrapper.setScriptReader(await ZipReader(new Uint8Array(zipBytes)));
```

#### `DirReader(...dirs: string[]): ScriptReader`
Node-only directory reader with fallback order.

```ts
wrapper.setScriptReader(DirReader('./ygopro-scripts', './custom-scripts'));
```

### Replay Functions

#### `playYrp(wrapper: OcgcoreWrapper, yrpOrBytes: YGOProYrp | Uint8Array): Uint8Array[]`
Run a complete replay and return all messages as raw bytes.

**Parameters:**
- `wrapper`: Initialized `OcgcoreWrapper` with script/card readers configured
- `yrpOrBytes`: `YGOProYrp` instance or raw `.yrp/.yrp2` bytes

**Returns:** Array of raw message bytes

**Throws:** `'Got MSG_RETRY'` if a retry message is encountered

#### `playYrpStep(wrapper: OcgcoreWrapper, yrpOrBytes: YGOProYrp | Uint8Array): Generator<{ duel: OcgcoreDuel, result: OcgcoreProcessResult }>`
Step through a replay with full control over execution.

**Yields:**
- `duel`: Current `OcgcoreDuel` instance (use for queries)
- `result`: Process result with `{ raw, status, message? }` where `message` is from `ygopro-msg-encode`

**Example:**
```ts
for (const { duel, result } of playYrpStep(wrapper, yrpBytes)) {
  if (result.message) {
    console.log('Message type:', result.message.constructor.name);
  }
  
  // Query game state at any point
  const fieldInfo = duel.queryFieldInfo();
  const handCards = duel.queryFieldCard({ 
    player: 0, 
    location: LOCATION_HAND, 
    queryFlag: QUERY_CODE 
  });
}
```

### Card Reader

#### `createSqljsCardReader(...dbs: Database[]): CardReader`
Build a `CardReader` from one or more SQL.js databases with fallback order.

```ts
import initSqlJs from 'sql.js';

const SQL = await initSqlJs();
const db1 = new SQL.Database(officialCards);
const db2 = new SQL.Database(customCards);

// Try db1 first, fallback to db2
wrapper.setCardReader(createSqljsCardReader(db1, db2));
```

### Constants

#### `OcgcoreCommonConstants`
Message types and query flags (e.g., `MSG_NEW_TURN`, `QUERY_CODE`, `QUERY_ATTACK`).

#### `OcgcoreScriptConstants`
Game constants (e.g., `LOCATION_MZONE`, `POS_FACEUP_ATTACK`, `TYPE_MONSTER`).

### Integration with ygopro-msg-encode

All query methods and `process()` return typed objects from [`ygopro-msg-encode`](https://github.com/purerosefallen/ygopro-msg-encode):

```ts
import { YGOProMsgNewTurn, CardQuery } from 'ygopro-msg-encode';

// Process returns parsed messages
const { message } = duel.process();
if (message instanceof YGOProMsgNewTurn) {
  console.log('Turn player:', message.player);
}

// Query methods return CardQuery objects
const { card } = duel.queryCard({ 
  player: 0, 
  location: LOCATION_MZONE, 
  sequence: 0,
  queryFlag: QUERY_CODE | QUERY_ATTACK 
});

if (card) {
  console.log('Card code:', card.code);
  console.log('Attack:', card.attack);
  console.log('Position:', card.position);
}

// queryFieldInfo returns YGOProMsgReloadField
const { field } = duel.queryFieldInfo();
console.log('Duel rule:', field.duelRule);
console.log('Player 0 LP:', field.players[0].lp);
console.log('Player 0 hand count:', field.players[0].handCount);
```

## Build / Scripts
- `npm run build` – build CJS + ESM + types
- `npm run fetch-ocgcore` – download vendor WASM and JS
- `npm run gen-constants` – regenerate constants from upstream sources

## Notes
- This package ships both CJS and ESM builds.
- WASM binaries are bundled under `dist/vendor`.
