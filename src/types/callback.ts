import type { OcgcoreDuel } from '../ocgcore-duel';
import type { OcgcoreMessageType } from './ocgcore-enums';
import type { CardData } from 'ygopro-msg-encode';

export type WithFinalizer<F extends (...args: any[]) => any> =
  | F
  | {
      apply: F;
      finalize?: () => void;
    };

export type ScriptReaderFn = (
  path: string,
) => string | Uint8Array | null | undefined;

export type CardReaderFn = (
  cardId: number,
) => Partial<CardData> | null | undefined;

export type MessageHandlerFn = (
  duel: OcgcoreDuel,
  message: string,
  type: OcgcoreMessageType,
) => void;

export type ScriptReader = WithFinalizer<ScriptReaderFn>;
export type CardReader = WithFinalizer<CardReaderFn>;
export type MessageHandler = WithFinalizer<MessageHandlerFn>;
