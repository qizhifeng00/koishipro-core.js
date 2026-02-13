import type {
  YGOProMsgBase,
  CardQuery,
  YGOProMsgReloadField,
} from 'ygopro-msg-encode';

export interface OcgcoreBinaryResult {
  length: number;
  raw: Uint8Array;
}

type Parsed<T, TNoParse extends boolean | undefined> = TNoParse extends true
  ? undefined
  : T;

export type OcgcoreCardQueryResult<TNoParse extends boolean | undefined = false> =
  OcgcoreBinaryResult & {
    card: TNoParse extends true ? null : CardQuery | null;
  };

export type OcgcoreFieldCardQueryResult<
  TNoParse extends boolean | undefined = false,
> = OcgcoreBinaryResult & {
  cards: TNoParse extends true ? [] : CardQuery[];
};

export interface OcgcoreMessageResult extends OcgcoreBinaryResult {}

export type OcgcoreProcessResult<TNoParse extends boolean | undefined = false> =
  OcgcoreBinaryResult & {
    status: number;
    message?: Parsed<YGOProMsgBase, TNoParse>;
  };

export type OcgcoreFieldInfoResult<TNoParse extends boolean | undefined = false> =
  OcgcoreBinaryResult & {
    field: Parsed<YGOProMsgReloadField, TNoParse>;
  };

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
