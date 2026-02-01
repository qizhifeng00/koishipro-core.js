import type { OcgcoreDuel } from '../ocgcore-duel';
import type { OcgcoreMessageType } from './ocgcore-enums';
import type { CardDataInput } from './card-data';

export type ScriptReader = (
  path: string,
) => string | Uint8Array | null | undefined;

export type CardReader = (cardId: number) => CardDataInput | null | undefined;

export type MessageHandler = (
  duel: OcgcoreDuel,
  message: string,
  type: OcgcoreMessageType,
) => void;
