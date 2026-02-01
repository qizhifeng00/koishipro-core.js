/// <reference types="emscripten" />

export interface OcgcoreModule extends EmscriptenModule {
  _malloc(size: number): number;
  _free(ptr: number): void;
  _set_script_reader(reader: number): void;
  _set_card_reader(reader: number): void;
  _set_message_handler(handler: number): void;
  _default_script_reader(namePtr: number, dataPtr: number): number;
  _create_duel(seed: number): number;
  _create_duel_v2(seedSequencePtr: number): number;
  _start_duel(duelPtr: number, options: number): void;
  _end_duel(duelPtr: number): void;
  _set_player_info(duelPtr: number, playerId: number, lp: number, startCount: number, drawCount: number): void;
  _get_log_message(duelPtr: number, bufPtr: number): number;
  _get_message(duelPtr: number, bufPtr: number): number;
  _process(duelPtr: number): number;
  _new_card(duelPtr: number, code: number, owner: number, playerId: number, location: number, sequence: number, position: number): void;
  _new_tag_card(duelPtr: number, code: number, owner: number, location: number): void;
  _query_card(duelPtr: number, playerId: number, location: number, sequence: number, queryFlag: number, bufPtr: number, useCache: number): number;
  _query_field_count(duelPtr: number, playerId: number, location: number): number;
  _query_field_card(duelPtr: number, playerId: number, location: number, queryFlag: number, bufPtr: number, useCache: number): number;
  _query_field_info(duelPtr: number, bufPtr: number): number;
  _set_responsei(duelPtr: number, value: number): void;
  _set_responseb(duelPtr: number, bufPtr: number): void;
  _preload_script(duelPtr: number, scriptNamePtr: number): void;
  _get_registry_value(duelPtr: number, keyPtr: number, keyLen: number, outBufPtr: number): number;
  _set_registry_value(duelPtr: number, keyPtr: number, keyLen: number, valuePtr: number, valueLen: number): void;
  _get_registry_keys(duelPtr: number, bufPtr: number): number;
  _clear_registry(duelPtr: number): void;
  _dump_registry(duelPtr: number, bufPtr: number): number;
  _load_registry(duelPtr: number, bufPtr: number, length: number): void;
  ___stdio_exit(): void;
  addFunction: (func: (...args: number[]) => number | void, signature: string) => number;
  removeFunction: (index: number) => void;
}

export type OcgcoreFactory = ((
  moduleOverrides?: Partial<OcgcoreModule>
) => Promise<OcgcoreModule>);
