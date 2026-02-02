import { CardDataStruct } from '../structs/card-data';

export interface CardData {
  code: number;
  alias: number;
  setcode: number[] | Uint16Array;
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

export type CardDataInput = CardData;
