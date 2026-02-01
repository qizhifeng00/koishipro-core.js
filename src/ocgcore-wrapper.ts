import { Buffer } from 'buffer';
import Struct from 'typed-struct';
import { OcgcoreModule } from './vendor/libocgcore.shared';

if (typeof globalThis !== 'undefined' && !(globalThis as { Buffer?: unknown }).Buffer) {
  (globalThis as { Buffer?: unknown }).Buffer = Buffer;
}

export interface CardData {
  code: number;
  alias: number;
  setcode: Uint16Array;
  type: number;
  level: number;
  attribute: number;
  race: number;
  attack: number;
  defense: number;
  lscale: number;
  rscale: number;
  linkMarker: number;
}

export const CardDataStruct = new Struct()
  .UInt32LE('code')
  .UInt32LE('alias')
  .UInt16Array('setcode', 16)
  .UInt32LE('type')
  .UInt32LE('level')
  .UInt32LE('attribute')
  .UInt32LE('race')
  .Int32LE('attack')
  .Int32LE('defense')
  .UInt32LE('lscale')
  .UInt32LE('rscale')
  .UInt32LE('linkMarker')
  .compile();

export type CardDataStructInstance = InstanceType<typeof CardDataStruct>;
export type CardDataInput = CardData | CardDataStructInstance;

const MESSAGE_BUFFER_SIZE = 0x2000;
const QUERY_BUFFER_SIZE = 0x4000;
const REGISTRY_BUFFER_SIZE = 0x2000;
const LEN_FAIL = 0;
const LEN_EMPTY = 4;
const LEN_HEADER = 8;

export enum OcgcoreMessageType {
  ScriptError = 'ScriptError',
  DebugMessage = 'DebugMessage',
}

export enum OcgcoreDuelRule {
  Rule1 = 1,
  Rule2 = 2,
  MasterRule3 = 3,
  NewMasterRule = 4,
  MasterRule2020 = 5,
}

export enum OcgcoreDuelOptionFlag {
  TestMode = 0x01,
  AttackFirstTurn = 0x02,
  ObsoleteRuling = 0x08,
  PseudoShuffle = 0x10,
  TagMode = 0x20,
  SimpleAI = 0x40,
  ReturnDeckTop = 0x80,
  RevealDeckSeq = 0x100,
}

export interface OcgcoreStartDuelOptions {
  rule?: OcgcoreDuelRule | number;
  options?: number;
  flags?: Array<OcgcoreDuelOptionFlag | number>;
}

export interface OcgcoreSetPlayerInfoParams {
  playerId: number;
  lp: number;
  startCount: number;
  drawCount: number;
}

export interface OcgcoreNewCardParams {
  code: number;
  owner: number;
  playerId: number;
  location: number;
  sequence: number;
  position: number;
}

export interface OcgcoreNewTagCardParams {
  code: number;
  owner: number;
  location: number;
}

export interface OcgcoreQueryCardParams {
  playerId: number;
  location: number;
  sequence: number;
  queryFlag: number;
  useCache?: number;
}

export interface OcgcoreQueryFieldCountParams {
  playerId: number;
  location: number;
}

export interface OcgcoreQueryFieldCardParams {
  playerId: number;
  location: number;
  queryFlag: number;
  useCache?: number;
}

export interface OcgcoreBinaryResult {
  length: number;
  raw: Uint8Array;
}

export interface OcgcoreCardLocationRef {
  controller: number;
  location: number;
  sequence: number;
}

export interface OcgcoreCounterInfo {
  type: number;
  count: number;
}

export interface OcgcoreCardInfo {
  flags: number;
  empty: boolean;
  code?: number;
  position?: number;
  alias?: number;
  type?: number;
  level?: number;
  rank?: number;
  attribute?: number;
  race?: number;
  attack?: number;
  defense?: number;
  baseAttack?: number;
  baseDefense?: number;
  reason?: number;
  equipCard?: OcgcoreCardLocationRef;
  targetCards?: OcgcoreCardLocationRef[];
  overlayCards?: number[];
  counters?: OcgcoreCounterInfo[];
  owner?: number;
  status?: number;
  lscale?: number;
  rscale?: number;
  link?: number;
  linkMarker?: number;
}

export interface OcgcoreCardQueryResult extends OcgcoreBinaryResult {
  card: OcgcoreCardInfo | null;
}

export interface OcgcoreFieldCardQueryResult extends OcgcoreBinaryResult {
  cards: OcgcoreCardInfo[];
}

export interface OcgcoreMessageResult extends OcgcoreBinaryResult {}

export interface OcgcoreFieldInfoPlayerState {
  lp: number;
  mzone: Array<{ occupied: boolean; position?: number; xyzCount?: number }>;
  szone: Array<{ occupied: boolean; position?: number }>;
  deckCount: number;
  handCount: number;
  graveCount: number;
  removedCount: number;
  extraCount: number;
  extraPCount: number;
}

export interface OcgcoreFieldInfoChain {
  code: number;
  chainCard: OcgcoreCardLocationRef & { subSequence: number };
  trigger: OcgcoreCardLocationRef;
  description: number;
}

export interface OcgcoreFieldInfo {
  message: number;
  duelRule: number;
  players: [OcgcoreFieldInfoPlayerState, OcgcoreFieldInfoPlayerState];
  chains: OcgcoreFieldInfoChain[];
}

export interface OcgcoreFieldInfoResult extends OcgcoreBinaryResult {
  field: OcgcoreFieldInfo;
}

export interface OcgcoreRegistryValueResult extends OcgcoreBinaryResult {
  value: Uint8Array;
  text?: string;
}

export interface OcgcoreRegistryKeysResult extends OcgcoreBinaryResult {
  keys: string[];
}

export interface OcgcoreRegistryDumpEntry {
  key: string;
  value: Uint8Array;
  valueText?: string;
}

export interface OcgcoreRegistryDumpResult extends OcgcoreBinaryResult {
  entries: OcgcoreRegistryDumpEntry[];
}

export class OcgcoreDuel {
  private returnPtr = 0;
  private returnSize = 512;

  constructor(
    public ocgcoreWrapper: OcgcoreWrapper,
    public duelPtr: number,
  ) {}

  startDuel(options: number | OcgcoreStartDuelOptions): void {
    if (!this.returnPtr) {
      this.returnPtr = this.ocgcoreWrapper.malloc(this.returnSize);
    }
    const optionValue = this.ocgcoreWrapper.normalizeStartDuelOptions(options);
    this.ocgcoreWrapper.ocgcoreModule._start_duel(this.duelPtr, optionValue);
  }

  endDuel(): void {
    this.ocgcoreWrapper.ocgcoreModule._end_duel(this.duelPtr);
    if (this.returnPtr) {
      this.ocgcoreWrapper.free(this.returnPtr);
      this.returnPtr = 0;
    }
    this.ocgcoreWrapper.forgetDuel(this.duelPtr);
  }

  setPlayerInfo(info: OcgcoreSetPlayerInfoParams): void {
    this.ocgcoreWrapper.ocgcoreModule._set_player_info(
      this.duelPtr,
      info.playerId,
      info.lp,
      info.startCount,
      info.drawCount,
    );
  }

  _getLogMessage(bufPtr: number): number {
    return this.ocgcoreWrapper.ocgcoreModule._get_log_message(
      this.duelPtr,
      bufPtr,
    );
  }

  getMessage(length: number): OcgcoreMessageResult {
    const ptr = this.ocgcoreWrapper.malloc(MESSAGE_BUFFER_SIZE);
    this.ocgcoreWrapper.ocgcoreModule._get_message(this.duelPtr, ptr);
    const raw = this.ocgcoreWrapper.copyHeap(ptr, length);
    this.ocgcoreWrapper.free(ptr);
    return { length, raw };
  }

  process(): number {
    return this.ocgcoreWrapper.ocgcoreModule._process(this.duelPtr);
  }

  newCard(card: OcgcoreNewCardParams): void {
    this.ocgcoreWrapper.ocgcoreModule._new_card(
      this.duelPtr,
      card.code,
      card.owner,
      card.playerId,
      card.location,
      card.sequence,
      card.position,
    );
  }

  newTagCard(card: OcgcoreNewTagCardParams): void {
    this.ocgcoreWrapper.ocgcoreModule._new_tag_card(
      this.duelPtr,
      card.code,
      card.owner,
      card.location,
    );
  }

  queryCard(query: OcgcoreQueryCardParams): OcgcoreCardQueryResult {
    const ptr = this.ocgcoreWrapper.malloc(QUERY_BUFFER_SIZE);
    const length = this.ocgcoreWrapper.ocgcoreModule._query_card(
      this.duelPtr,
      query.playerId,
      query.location,
      query.sequence,
      query.queryFlag,
      ptr,
      query.useCache ?? 0,
    );
    const raw = this.ocgcoreWrapper.copyHeap(ptr, length);
    this.ocgcoreWrapper.free(ptr);
    const card =
      length <= LEN_HEADER
        ? null
        : this.ocgcoreWrapper.parseCardQuery(raw, length);
    return { length, raw, card };
  }

  queryFieldCount(query: OcgcoreQueryFieldCountParams): number {
    return this.ocgcoreWrapper.ocgcoreModule._query_field_count(
      this.duelPtr,
      query.playerId,
      query.location,
    );
  }

  queryFieldCard(query: OcgcoreQueryFieldCardParams): OcgcoreFieldCardQueryResult {
    const ptr = this.ocgcoreWrapper.malloc(QUERY_BUFFER_SIZE);
    const length = this.ocgcoreWrapper.ocgcoreModule._query_field_card(
      this.duelPtr,
      query.playerId,
      query.location,
      query.queryFlag,
      ptr,
      query.useCache ?? 0,
    );
    const raw = this.ocgcoreWrapper.copyHeap(ptr, length);
    this.ocgcoreWrapper.free(ptr);
    const cards = this.ocgcoreWrapper.parseFieldCardQuery(raw, length);
    return { length, raw, cards };
  }

  queryFieldInfo(): OcgcoreFieldInfoResult {
    const ptr = this.ocgcoreWrapper.malloc(QUERY_BUFFER_SIZE);
    const length = this.ocgcoreWrapper.ocgcoreModule._query_field_info(
      this.duelPtr,
      ptr,
    );
    const raw = this.ocgcoreWrapper.copyHeap(ptr, length);
    this.ocgcoreWrapper.free(ptr);
    const field = this.ocgcoreWrapper.parseFieldInfo(raw);
    return { length, raw, field };
  }

  setResponseInt(value: number): void {
    this.ocgcoreWrapper.ocgcoreModule._set_responsei(this.duelPtr, value);
  }

  setResponse(response: Uint8Array): void {
    if (response.length > this.returnSize) {
      this.ocgcoreWrapper.free(this.returnPtr);
      this.returnPtr = this.ocgcoreWrapper.malloc(response.length);
      this.returnSize = response.length;
    }
    this.ocgcoreWrapper.setHeap(this.returnPtr, response);
    this.ocgcoreWrapper.ocgcoreModule._set_responseb(
      this.duelPtr,
      this.returnPtr,
    );
  }

  preloadScript(scriptPath: string): void {
    this.ocgcoreWrapper.useTmpData(
      (ptr) => this.ocgcoreWrapper.ocgcoreModule._preload_script(this.duelPtr, ptr),
      scriptPath,
    );
  }

  getRegistryValue(key: string): OcgcoreRegistryValueResult {
    const keyBytes = this.ocgcoreWrapper.encodeUtf8(key);
    const outPtr = this.ocgcoreWrapper.malloc(REGISTRY_BUFFER_SIZE);
    const length = this.ocgcoreWrapper.useTmpData(
      (keyPtr) =>
        this.ocgcoreWrapper.ocgcoreModule._get_registry_value(
          this.duelPtr,
          keyPtr,
          keyBytes.length,
          outPtr,
        ),
      key,
    );
    const raw = this.ocgcoreWrapper.copyHeap(outPtr, Math.max(0, length));
    this.ocgcoreWrapper.free(outPtr);
    const value = raw;
    const text = length >= 0 ? this.ocgcoreWrapper.decodeUtf8(raw) : undefined;
    return { length, raw, value, text };
  }

  setRegistryValue(key: string, value: string): void {
    const keyBytes = this.ocgcoreWrapper.encodeUtf8(key);
    const valueBytes = this.ocgcoreWrapper.encodeUtf8(value);
    this.ocgcoreWrapper.useTmpData(
      (keyPtr, valuePtr) =>
        this.ocgcoreWrapper.ocgcoreModule._set_registry_value(
          this.duelPtr,
          keyPtr,
          keyBytes.length,
          valuePtr,
          valueBytes.length,
        ),
      key,
      value,
    );
  }

  getRegistryKeys(): OcgcoreRegistryKeysResult {
    const outPtr = this.ocgcoreWrapper.malloc(REGISTRY_BUFFER_SIZE);
    const length = this.ocgcoreWrapper.ocgcoreModule._get_registry_keys(
      this.duelPtr,
      outPtr,
    );
    const raw = this.ocgcoreWrapper.copyHeap(outPtr, Math.max(0, length));
    this.ocgcoreWrapper.free(outPtr);
    const keys =
      length >= 0 ? this.ocgcoreWrapper.parseRegistryKeys(raw) : [];
    return { length, raw, keys };
  }

  clearRegistry(): void {
    this.ocgcoreWrapper.ocgcoreModule._clear_registry(this.duelPtr);
  }

  dumpRegistry(): OcgcoreRegistryDumpResult {
    const outPtr = this.ocgcoreWrapper.malloc(REGISTRY_BUFFER_SIZE);
    const length = this.ocgcoreWrapper.ocgcoreModule._dump_registry(
      this.duelPtr,
      outPtr,
    );
    const raw = this.ocgcoreWrapper.copyHeap(outPtr, Math.max(0, length));
    this.ocgcoreWrapper.free(outPtr);
    const entries =
      length >= 0 ? this.ocgcoreWrapper.parseRegistryDump(raw) : [];
    return { length, raw, entries };
  }

  loadRegistry(input: Uint8Array): void {
    this.ocgcoreWrapper.useTmpData(
      (ptr) =>
        this.ocgcoreWrapper.ocgcoreModule._load_registry(
          this.duelPtr,
          ptr,
          input.length,
        ),
      input,
    );
  }
}

export class OcgcoreWrapper {
  private scriptBufferPtr = 0;
  private scriptBufferSize = 0;
  private logBufferPtr = 0;
  private logBufferSize = 0;
  private tmpStringBufferPtr = 0;
  private tmpStringBufferSize = 0;

  private scriptReaderFunc = 0;
  private cardReaderFunc = 0;
  private messageHandlerFunc = 0;

  private heapU8: Uint8Array;
  private heapView: DataView;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder('utf-8');
  private duels = new Map<number, OcgcoreDuel>();

  constructor(
    public ocgcoreModule: OcgcoreModule,
    options?: { scriptBufferSize?: number; logBufferSize?: number },
  ) {
    this.heapU8 = ocgcoreModule.HEAPU8 as Uint8Array;
    this.heapView = new DataView(this.heapU8.buffer);
    this.scriptBufferSize = options?.scriptBufferSize ?? 0x100000;
    this.logBufferSize = options?.logBufferSize ?? 1024;
  }

  getUTF8String(ptr: number): string {
    let length = 0;
    while (this.heapU8[ptr + length] !== 0) {
      length++;
    }
    return this.decoder.decode(this.heapU8.subarray(ptr, ptr + length));
  }

  encodeUtf8(value: string): Uint8Array {
    return this.encoder.encode(value);
  }

  decodeUtf8(value: Uint8Array): string {
    return this.decoder.decode(value);
  }

  normalizeStartDuelOptions(options: number | OcgcoreStartDuelOptions): number {
    if (typeof options === 'number') {
      return options;
    }
    const duelRule = options.rule ?? 0;
    let duelOptions = options.options ?? 0;
    if (options.flags?.length) {
      for (const flag of options.flags) {
        duelOptions |= flag;
      }
    }
    return ((duelRule & 0xffff) << 16) | (duelOptions & 0xffff);
  }

  getHeapSlice(ptr: number, length: number): Uint8Array {
    return this.heapU8.subarray(ptr, ptr + length);
  }

  setHeap(ptr: number, data: Uint8Array): void {
    this.heapU8.set(data, ptr);
  }

  copyHeap(ptr: number, length: number): Uint8Array {
    return this.heapU8.slice(ptr, ptr + length);
  }

  private readU8(buf: Uint8Array, offset: number): number {
    return buf[offset] ?? 0;
  }

  private readU16(buf: Uint8Array, offset: number): number {
    return new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getUint16(
      offset,
      true,
    );
  }

  private readI32(buf: Uint8Array, offset: number): number {
    return new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getInt32(
      offset,
      true,
    );
  }

  private readU32(buf: Uint8Array, offset: number): number {
    return new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getUint32(
      offset,
      true,
    );
  }

  private parseCardInfo(payload: Uint8Array): OcgcoreCardInfo {
    let offset = 0;
    const flags = this.readI32(payload, offset);
    offset += 4;
    const info: OcgcoreCardInfo = { flags, empty: flags === 0 };
    if (flags === 0) {
      return info;
    }

    if (flags & 0x1) {
      info.code = this.readI32(payload, offset);
      offset += 4;
    }
    if (flags & 0x2) {
      const pdata = this.readI32(payload, offset);
      offset += 4;
      info.position = (pdata >>> 24) & 0xff;
    }
    if (flags & 0x4) {
      info.alias = this.readI32(payload, offset);
      offset += 4;
    }
    if (flags & 0x8) {
      info.type = this.readI32(payload, offset);
      offset += 4;
    }
    if (flags & 0x10) {
      info.level = this.readI32(payload, offset);
      offset += 4;
    }
    if (flags & 0x20) {
      info.rank = this.readI32(payload, offset);
      offset += 4;
    }
    if (flags & 0x40) {
      info.attribute = this.readI32(payload, offset);
      offset += 4;
    }
    if (flags & 0x80) {
      info.race = this.readI32(payload, offset);
      offset += 4;
    }
    if (flags & 0x100) {
      info.attack = this.readI32(payload, offset);
      offset += 4;
    }
    if (flags & 0x200) {
      info.defense = this.readI32(payload, offset);
      offset += 4;
    }
    if (flags & 0x400) {
      info.baseAttack = this.readI32(payload, offset);
      offset += 4;
    }
    if (flags & 0x800) {
      info.baseDefense = this.readI32(payload, offset);
      offset += 4;
    }
    if (flags & 0x1000) {
      info.reason = this.readI32(payload, offset);
      offset += 4;
    }
    if (flags & 0x2000) {
      offset += 4;
    }
    if (flags & 0x4000) {
      const controller = this.readU8(payload, offset);
      const location = this.readU8(payload, offset + 1);
      const sequence = this.readU8(payload, offset + 2);
      info.equipCard = { controller, location, sequence };
      offset += 4;
    }
    if (flags & 0x8000) {
      const count = this.readI32(payload, offset);
      offset += 4;
      const targets: OcgcoreCardLocationRef[] = [];
      for (let i = 0; i < count; i++) {
        const controller = this.readU8(payload, offset);
        const location = this.readU8(payload, offset + 1);
        const sequence = this.readU8(payload, offset + 2);
        targets.push({ controller, location, sequence });
        offset += 4;
      }
      info.targetCards = targets;
    }
    if (flags & 0x10000) {
      const count = this.readI32(payload, offset);
      offset += 4;
      const overlay: number[] = [];
      for (let i = 0; i < count; i++) {
        overlay.push(this.readI32(payload, offset));
        offset += 4;
      }
      info.overlayCards = overlay;
    }
    if (flags & 0x20000) {
      const count = this.readI32(payload, offset);
      offset += 4;
      const counters: OcgcoreCounterInfo[] = [];
      for (let i = 0; i < count; i++) {
        const type = this.readU16(payload, offset);
        const ccount = this.readU16(payload, offset + 2);
        counters.push({ type, count: ccount });
        offset += 4;
      }
      info.counters = counters;
    }
    if (flags & 0x40000) {
      info.owner = this.readI32(payload, offset);
      offset += 4;
    }
    if (flags & 0x80000) {
      info.status = this.readI32(payload, offset);
      offset += 4;
    }
    if (flags & 0x200000) {
      info.lscale = this.readI32(payload, offset);
      offset += 4;
    }
    if (flags & 0x400000) {
      info.rscale = this.readI32(payload, offset);
      offset += 4;
    }
    if (flags & 0x800000) {
      info.link = this.readI32(payload, offset);
      offset += 4;
      info.linkMarker = this.readI32(payload, offset);
      offset += 4;
    }
    return info;
  }

  parseCardQuery(raw: Uint8Array, length: number): OcgcoreCardInfo | null {
    if (length <= LEN_HEADER) {
      return null;
    }
    const payload = raw.subarray(4, length);
    return this.parseCardInfo(payload);
  }

  parseFieldCardQuery(raw: Uint8Array, length: number): OcgcoreCardInfo[] {
    const cards: OcgcoreCardInfo[] = [];
    let offset = 0;
    while (offset + 4 <= length) {
      const chunkLen = this.readI32(raw, offset);
      if (chunkLen <= 0) {
        break;
      }
      const end = Math.min(length, offset + chunkLen);
      if (chunkLen <= LEN_HEADER) {
        cards.push({ flags: 0, empty: true });
      } else {
        const payload = raw.subarray(offset + 4, end);
        cards.push(this.parseCardInfo(payload));
      }
      offset += chunkLen;
    }
    return cards;
  }

  parseFieldInfo(raw: Uint8Array): OcgcoreFieldInfo {
    let offset = 0;
    const message = this.readU8(raw, offset++);
    const duelRule = this.readU8(raw, offset++);
    const players = [] as unknown as [
      OcgcoreFieldInfoPlayerState,
      OcgcoreFieldInfoPlayerState,
    ];

    for (let i = 0; i < 2; i++) {
      const lp = this.readI32(raw, offset);
      offset += 4;
      const mzone: OcgcoreFieldInfoPlayerState['mzone'] = [];
      for (let seq = 0; seq < 7; seq++) {
        const occupied = this.readU8(raw, offset++) !== 0;
        if (occupied) {
          const position = this.readU8(raw, offset++);
          const xyzCount = this.readU8(raw, offset++);
          mzone.push({ occupied, position, xyzCount });
        } else {
          mzone.push({ occupied });
        }
      }
      const szone: OcgcoreFieldInfoPlayerState['szone'] = [];
      for (let seq = 0; seq < 8; seq++) {
        const occupied = this.readU8(raw, offset++) !== 0;
        if (occupied) {
          const position = this.readU8(raw, offset++);
          szone.push({ occupied, position });
        } else {
          szone.push({ occupied });
        }
      }
      const deckCount = this.readU8(raw, offset++);
      const handCount = this.readU8(raw, offset++);
      const graveCount = this.readU8(raw, offset++);
      const removedCount = this.readU8(raw, offset++);
      const extraCount = this.readU8(raw, offset++);
      const extraPCount = this.readU8(raw, offset++);
      players[i] = {
        lp,
        mzone,
        szone,
        deckCount,
        handCount,
        graveCount,
        removedCount,
        extraCount,
        extraPCount,
      };
    }

    const chainCount = this.readU8(raw, offset++);
    const chains: OcgcoreFieldInfoChain[] = [];
    for (let i = 0; i < chainCount; i++) {
      const code = this.readU32(raw, offset);
      offset += 4;
      const infoLocation = this.readU32(raw, offset);
      offset += 4;
      const chainCard = {
        controller: infoLocation & 0xff,
        location: (infoLocation >>> 8) & 0xff,
        sequence: (infoLocation >>> 16) & 0xff,
        subSequence: (infoLocation >>> 24) & 0xff,
      };
      const trigger = {
        controller: this.readU8(raw, offset++),
        location: this.readU8(raw, offset++),
        sequence: this.readU8(raw, offset++),
      };
      const description = this.readU32(raw, offset);
      offset += 4;
      chains.push({ code, chainCard, trigger, description });
    }

    return { message, duelRule, players, chains };
  }

  parseRegistryKeys(raw: Uint8Array): string[] {
    const keys: string[] = [];
    let offset = 0;
    while (offset + 2 <= raw.length) {
      const len = this.readU16(raw, offset);
      offset += 2;
      if (offset + len > raw.length) {
        break;
      }
      const keyBytes = raw.subarray(offset, offset + len);
      offset += len;
      keys.push(this.decodeUtf8(keyBytes));
    }
    return keys;
  }

  parseRegistryDump(raw: Uint8Array): OcgcoreRegistryDumpEntry[] {
    const entries: OcgcoreRegistryDumpEntry[] = [];
    let offset = 0;
    while (offset + 4 <= raw.length) {
      const keyLen = this.readU16(raw, offset);
      const valLen = this.readU16(raw, offset + 2);
      offset += 4;
      if (offset + keyLen + valLen > raw.length) {
        break;
      }
      const keyBytes = raw.subarray(offset, offset + keyLen);
      offset += keyLen;
      const valueBytes = raw.subarray(offset, offset + valLen);
      offset += valLen;
      const entry: OcgcoreRegistryDumpEntry = {
        key: this.decodeUtf8(keyBytes),
        value: valueBytes,
      };
      entry.valueText = this.decodeUtf8(valueBytes);
      entries.push(entry);
    }
    return entries;
  }

  useTmpData<R>(
    cb: (...args: number[]) => R,
    ...args: Array<string | Uint8Array>
  ): R {
    const encoded = args.map((item) =>
      typeof item === 'string' ? this.encoder.encode(item) : item,
    );
    const totalLength = encoded.reduce((acc, bytes) => acc + bytes.length + 1, 0);
    if (totalLength > this.tmpStringBufferSize) {
      if (this.tmpStringBufferPtr) {
        this.ocgcoreModule._free(this.tmpStringBufferPtr);
      }
      this.tmpStringBufferPtr = this.ocgcoreModule._malloc(totalLength);
      this.tmpStringBufferSize = totalLength;
    }

    let offset = 0;
    const ptrs = encoded.map((bytes) => {
      const ptr = this.tmpStringBufferPtr + offset;
      this.heapU8.set(bytes, ptr);
      this.heapU8[ptr + bytes.length] = 0;
      offset += bytes.length + 1;
      return ptr;
    });

    return cb(...ptrs);
  }

  private createFunction(
    fn: (...args: number[]) => number | void,
    signature: string,
  ): number {
    return this.ocgcoreModule.addFunction(fn, signature);
  }

  addFunction(fn: (...args: number[]) => number | void, signature: string): number {
    return this.ocgcoreModule.addFunction(fn, signature);
  }

  removeFunction(index: number): void {
    this.ocgcoreModule.removeFunction(index);
  }

  createDuel(seed: number): OcgcoreDuel {
    const duelPtr = this.ocgcoreModule._create_duel(seed);
    return this.getOrCreateDuel(duelPtr);
  }

  createDuelV2(seedSequence: number[]): OcgcoreDuel {
    const count = seedSequence.length;
    const byteLength = count * 4;
    const ptr = this.ocgcoreModule._malloc(byteLength);
    const view = new Uint32Array(this.heapU8.buffer, ptr, count);
    for (let i = 0; i < count; i++) {
      view[i] = seedSequence[i] >>> 0;
    }
    const duelPtr = this.ocgcoreModule._create_duel_v2(ptr);
    this.ocgcoreModule._free(ptr);
    return this.getOrCreateDuel(duelPtr);
  }

  defaultScriptReader(namePtr: number, dataPtr: number): number {
    return this.ocgcoreModule._default_script_reader(namePtr, dataPtr);
  }

  malloc(size: number): number {
    return this.ocgcoreModule._malloc(size);
  }

  free(ptr: number): void {
    this.ocgcoreModule._free(ptr);
  }

  _setScriptReader(funcPtr: number): void {
    this.ocgcoreModule._set_script_reader(funcPtr);
  }

  _setCardReader(funcPtr: number): void {
    this.ocgcoreModule._set_card_reader(funcPtr);
  }

  _setMessageHandler(funcPtr: number): void {
    this.ocgcoreModule._set_message_handler(funcPtr);
  }

  stdioExit(): void {
    this.ocgcoreModule.___stdio_exit();
  }

  setScriptReader(reader: (path: string) => string | Uint8Array): void {
    if (this.scriptReaderFunc) {
      this.ocgcoreModule.removeFunction(this.scriptReaderFunc);
    }

    if (!this.scriptBufferPtr) {
      this.scriptBufferPtr = this.ocgcoreModule._malloc(this.scriptBufferSize);
    }

    this.scriptReaderFunc = this.createFunction((scriptPtr, lenPtr) => {
      const scriptPath = this.getUTF8String(scriptPtr);
      const content = reader(scriptPath);
      if (content == null) {
        return 0;
      }

      const bytes =
        typeof content === 'string' ? this.encoder.encode(content) : content;
      if (bytes.length > this.scriptBufferSize) {
        this.ocgcoreModule._free(this.scriptBufferPtr);
        this.scriptBufferPtr = this.ocgcoreModule._malloc(bytes.length);
        this.scriptBufferSize = bytes.length;
      }

      this.heapU8.set(bytes, this.scriptBufferPtr);
      this.heapView.setInt32(lenPtr, bytes.length, true);
      return this.scriptBufferPtr;
    }, 'iii');

    this._setScriptReader(this.scriptReaderFunc);
  }

  setCardReader(reader: (cardId: number) => CardDataInput): void {
    if (this.cardReaderFunc) {
      this.ocgcoreModule.removeFunction(this.cardReaderFunc);
    }

    this.cardReaderFunc = this.createFunction((cardId, cardDataPtr) => {
      const data = reader(cardId);
      if (!data) {
        return 0;
      }

      const CardDataCtor = CardDataStruct as unknown as { new (): CardDataStructInstance };
      let buf: Uint8Array;
      if (data instanceof CardDataCtor) {
        buf = CardDataStruct.raw(data) as Uint8Array;
      } else {
        const cardData = new CardDataCtor();
        cardData.code = data.code;
        cardData.alias = data.alias;
        if (data.setcode.length === 16 && data.setcode instanceof Uint16Array) {
          cardData.setcode = data.setcode;
        } else {
          const setcode = new Uint16Array(16);
          for (let i = 0; i < 16 && i < data.setcode.length; i++) {
            setcode[i] = data.setcode[i];
          }
          cardData.setcode = setcode;
        }
        cardData.type = data.type;
        cardData.level = data.level;
        cardData.attribute = data.attribute;
        cardData.race = data.race;
        cardData.attack = data.attack;
        cardData.defense = data.defense;
        cardData.lscale = data.lscale;
        cardData.rscale = data.rscale;
        cardData.linkMarker = data.linkMarker;
        buf = CardDataStruct.raw(cardData) as Uint8Array;
      }

      this.heapU8.set(buf, cardDataPtr);
      return 0;
    }, 'iii');

    this._setCardReader(this.cardReaderFunc);
  }

  setMessageHandler(
    handler: (
      duel: OcgcoreDuel,
      message: string,
      type: OcgcoreMessageType | number,
    ) => void,
  ): void {
    if (!this.logBufferPtr) {
      this.logBufferPtr = this.ocgcoreModule._malloc(this.logBufferSize);
    }
    if (this.messageHandlerFunc) {
      this.ocgcoreModule.removeFunction(this.messageHandlerFunc);
    }
    this.messageHandlerFunc = this.createFunction((duelPtr, messageType) => {
      this.ocgcoreModule._get_log_message(duelPtr, this.logBufferPtr);
      const message = this.getUTF8String(this.logBufferPtr);
      const type =
        messageType === 1
          ? OcgcoreMessageType.ScriptError
          : messageType === 2
            ? OcgcoreMessageType.DebugMessage
            : messageType;
      handler(
        this.getOrCreateDuel(duelPtr),
        message,
        type,
      );
    }, 'iii');
    this._setMessageHandler(this.messageHandlerFunc);
  }

  getOrCreateDuel(duelPtr: number): OcgcoreDuel {
    const existing = this.duels.get(duelPtr);
    if (existing) {
      return existing;
    }
    const duel = new OcgcoreDuel(this, duelPtr);
    this.duels.set(duelPtr, duel);
    return duel;
  }

  forgetDuel(duelPtr: number): void {
    this.duels.delete(duelPtr);
  }

  finalize(): void {
    if (this.scriptReaderFunc) {
      this.ocgcoreModule.removeFunction(this.scriptReaderFunc);
      this.scriptReaderFunc = 0;
    }
    if (this.cardReaderFunc) {
      this.ocgcoreModule.removeFunction(this.cardReaderFunc);
      this.cardReaderFunc = 0;
    }
    if (this.messageHandlerFunc) {
      this.ocgcoreModule.removeFunction(this.messageHandlerFunc);
      this.messageHandlerFunc = 0;
    }

    if (this.scriptBufferPtr) {
      this.ocgcoreModule._free(this.scriptBufferPtr);
      this.scriptBufferPtr = 0;
      this.scriptBufferSize = 0;
    }
    if (this.logBufferPtr) {
      this.ocgcoreModule._free(this.logBufferPtr);
      this.logBufferPtr = 0;
      this.logBufferSize = 0;
    }
    if (this.tmpStringBufferPtr) {
      this.ocgcoreModule._free(this.tmpStringBufferPtr);
      this.tmpStringBufferPtr = 0;
      this.tmpStringBufferSize = 0;
    }
  }
}
