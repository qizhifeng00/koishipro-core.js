import type { CardData } from 'ygopro-msg-encode';
import type { CardReader } from '../types/callback';

export function MapCardReader(
  cardMap: Map<number, Partial<CardData>>,
): CardReader {
  return (cardId: number) => cardMap.get(cardId) ?? null;
}
