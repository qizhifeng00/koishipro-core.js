import {
  OcgcoreCardQueryResult,
  OcgcoreFieldCardQueryResult,
  OcgcoreFieldInfoResult,
  OcgcoreMessageResult,
  OcgcoreProcessResult,
  OcgcoreRegistryDumpResult,
  OcgcoreRegistryKeysResult,
  OcgcoreRegistryValueResult,
} from './types/ocgcore-results';
import {
  OcgcoreNewCardParams,
  OcgcoreNewTagCardParams,
  OcgcoreQueryCardParams,
  OcgcoreQueryFieldCardParams,
  OcgcoreQueryFieldCountParams,
  OcgcoreSetPlayerInfoParams,
  OcgcoreStartDuelOptions,
} from './types/ocgcore-params';
import {
  MESSAGE_BUFFER_SIZE,
  QUERY_BUFFER_SIZE,
  REGISTRY_BUFFER_SIZE,
  LEN_HEADER,
} from './constants';
import {
  decodeUtf8,
  parseCardQuery,
  parseFieldCardQuery,
  parseFieldInfo,
  parseRegistryDump,
  parseRegistryKeys,
} from './adapters/ocgcore-parsers';
import { normalizeStartDuelOptions } from './adapters/start-duel';
import { OcgcoreWrapper } from './ocgcore-wrapper';
import { encodeUtf8 } from './utility/utf8';

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
    const optionValue = normalizeStartDuelOptions(options);
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

  private getMessage(length: number): OcgcoreMessageResult {
    const ptr = this.ocgcoreWrapper.malloc(MESSAGE_BUFFER_SIZE);
    this.ocgcoreWrapper.ocgcoreModule._get_message(this.duelPtr, ptr);
    const raw = this.ocgcoreWrapper.copyHeap(ptr, length);
    this.ocgcoreWrapper.free(ptr);
    return { length, raw };
  }

  process(): OcgcoreProcessResult {
    const result = this.ocgcoreWrapper.ocgcoreModule._process(this.duelPtr);
    const length = (result & 0x0fffffff) >>> 0;
    const status = ((result >>> 28) & 0x0f) >>> 0;
    const message = this.getMessage(length);
    return { length: message.length, raw: message.raw, status };
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
    const card = length <= LEN_HEADER ? null : parseCardQuery(raw, length);
    return { length, raw, card };
  }

  queryFieldCount(query: OcgcoreQueryFieldCountParams): number {
    return this.ocgcoreWrapper.ocgcoreModule._query_field_count(
      this.duelPtr,
      query.playerId,
      query.location,
    );
  }

  queryFieldCard(
    query: OcgcoreQueryFieldCardParams,
  ): OcgcoreFieldCardQueryResult {
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
    const cards = parseFieldCardQuery(raw, length);
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
    const field = parseFieldInfo(raw);
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
      (ptr) =>
        this.ocgcoreWrapper.ocgcoreModule._preload_script(this.duelPtr, ptr),
      scriptPath,
    );
  }

  getRegistryValue(key: string): OcgcoreRegistryValueResult {
    const keyBytes = encodeUtf8(key);
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
    const text = length >= 0 ? decodeUtf8(raw) : undefined;
    return { length, raw, value, text };
  }

  setRegistryValue(key: string, value: string): void {
    const keyBytes = encodeUtf8(key);
    const valueBytes = encodeUtf8(value);
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
    const keys = length >= 0 ? parseRegistryKeys(raw) : [];
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
    const entries = length >= 0 ? parseRegistryDump(raw) : [];
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
