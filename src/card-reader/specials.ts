import type { CardDataEntry } from 'ygopro-cdb-encode';

// Keep in sync with ygopro/gframe/data_manager.cpp (extra_setcode).
const EXTRA_SETCODE = new Map<number, number[]>([
  [8512558, [0x8f, 0x54, 0x59, 0x82, 0x13a]],
  [55088578, [0x8f, 0x54, 0x59, 0x82, 0x13a]],
]);

export function applyCardSpecials(
  cardId: number,
  data: Partial<CardDataEntry>,
): Partial<CardDataEntry> {
  const setcode = EXTRA_SETCODE.get(cardId);
  if (!setcode) {
    return data;
  }
  return {
    ...data,
    setcode: [...setcode],
  };
}
