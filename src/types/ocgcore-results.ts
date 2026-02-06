import type {
  CardQuery,
  YGOProMsgBase,
  YGOProMsgReloadField,
} from 'ygopro-msg-encode';

export interface OcgcoreBinaryResult {
  length: number;
  raw: Uint8Array;
}

export interface OcgcoreCardQueryResult extends OcgcoreBinaryResult {
  card: CardQuery | null;
}

export interface OcgcoreFieldCardQueryResult extends OcgcoreBinaryResult {
  cards: CardQuery[];
}

export interface OcgcoreMessageResult extends OcgcoreBinaryResult {}

export interface OcgcoreProcessResult extends OcgcoreBinaryResult {
  status: number;
  message?: YGOProMsgBase;
}

export interface OcgcoreFieldInfoResult extends OcgcoreBinaryResult {
  field: YGOProMsgReloadField;
}

export interface OcgcoreRegistryValueResult extends OcgcoreBinaryResult {
  value: Uint8Array;
  text?: string;
}

export interface OcgcoreRegistryKeysResult extends OcgcoreBinaryResult {
  keys: string[];
}

export interface OcgcoreRegistryDumpResult extends OcgcoreBinaryResult {
  dict: Record<string, string>;
}
