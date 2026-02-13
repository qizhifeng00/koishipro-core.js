import { OcgcoreDuelOptionFlag, OcgcoreDuelRule } from './ocgcore-enums';

export interface OcgcoreStartDuelOptions {
  rule?: OcgcoreDuelRule | number;
  options?: number;
  flags?: Array<OcgcoreDuelOptionFlag | number>;
}

export interface OcgcoreProcessOptions {
  /**
   * Do not parse the message payload with `ygopro-msg-encode`.
   * When true, `process().message` will always be `undefined`.
   */
  noParse?: boolean;
}

export interface OcgcoreSetPlayerInfoParams {
  player: number;
  lp: number;
  startHand: number;
  drawCount: number;
}

export interface OcgcoreNewCardParams {
  code: number;
  owner: number;
  player: number;
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
  player: number;
  location: number;
  sequence: number;
  queryFlag: number;
  useCache?: number;
}

export interface OcgcoreQueryFieldCountParams {
  player: number;
  location: number;
}

export interface OcgcoreQueryFieldCardParams {
  player: number;
  location: number;
  queryFlag: number;
  useCache?: number;
}
