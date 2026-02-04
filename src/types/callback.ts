import type { OcgcoreDuel } from '../ocgcore-duel';
import type { OcgcoreMessageType } from './ocgcore-enums';
import type { CardData } from 'ygopro-msg-encode';

export type ScriptReader = (
  path: string,
) => string | Uint8Array | null | undefined;

export type CardReader = (
  cardId: number,
) => Partial<CardData> | null | undefined;

export type MessageHandler = (
  duel: OcgcoreDuel,
  message: string,
  type: OcgcoreMessageType,
) => void;
