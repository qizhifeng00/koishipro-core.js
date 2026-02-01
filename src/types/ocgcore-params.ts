import { OcgcoreDuelOptionFlag, OcgcoreDuelRule } from './ocgcore-enums';

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
