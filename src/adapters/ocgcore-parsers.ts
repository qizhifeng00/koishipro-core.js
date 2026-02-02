import { LEN_HEADER } from '../constants';
import { readI32, readU16 } from '../utility/binary';
import { decodeUtf8 } from '../utility/utf8';
import { CardQuery, YGOProMsgReloadField } from 'ygopro-msg-encode';

// Internal interface for registry parsing
interface RegistryDumpEntry {
  key: string;
  value: Uint8Array;
  valueText?: string;
}

export function parseCardQuery(
  raw: Uint8Array,
  length: number,
): CardQuery | null {
  if (length <= LEN_HEADER) {
    return null;
  }
  const payload = raw.subarray(4, length);
  return new CardQuery().fromPayload(payload);
}

export function parseFieldCardQuery(
  raw: Uint8Array,
  length: number,
): CardQuery[] {
  const cards: CardQuery[] = [];
  let offset = 0;
  while (offset + 4 <= length) {
    const chunkLen = readI32(raw, offset);
    if (chunkLen <= 0) {
      break;
    }
    const end = Math.min(length, offset + chunkLen);
    if (chunkLen <= LEN_HEADER) {
      const emptyCard = new CardQuery();
      emptyCard.flags = 0;
      emptyCard.empty = true;
      cards.push(emptyCard);
    } else {
      const payload = raw.subarray(offset + 4, end);
      cards.push(new CardQuery().fromPayload(payload));
    }
    offset += chunkLen;
  }
  return cards;
}

export function parseFieldInfo(raw: Uint8Array): YGOProMsgReloadField {
  // query_field_info() in ocgcore returns data that starts with MSG_RELOAD_FIELD (162) byte
  // Format: [MSG_RELOAD_FIELD][duel_rule][player0_data][player1_data][chains]
  // YGOProMsgReloadField.fromPayload() expects the full message including the identifier
  return new YGOProMsgReloadField().fromPayload(raw);
}

export function parseRegistryKeys(raw: Uint8Array): string[] {
  const keys: string[] = [];
  let offset = 0;
  while (offset + 2 <= raw.length) {
    const len = readU16(raw, offset);
    offset += 2;
    if (offset + len > raw.length) {
      break;
    }
    const keyBytes = raw.subarray(offset, offset + len);
    offset += len;
    keys.push(decodeUtf8(keyBytes));
  }
  return keys;
}

export function parseRegistryDump(raw: Uint8Array): RegistryDumpEntry[] {
  const entries: RegistryDumpEntry[] = [];
  let offset = 0;
  while (offset + 4 <= raw.length) {
    const keyLen = readU16(raw, offset);
    const valLen = readU16(raw, offset + 2);
    offset += 4;
    if (offset + keyLen + valLen > raw.length) {
      break;
    }
    const keyBytes = raw.subarray(offset, offset + keyLen);
    offset += keyLen;
    const valueBytes = raw.subarray(offset, offset + valLen);
    offset += valLen;
    const entry: RegistryDumpEntry = {
      key: decodeUtf8(keyBytes),
      value: valueBytes,
    };
    entry.valueText = decodeUtf8(valueBytes);
    entries.push(entry);
  }
  return entries;
}
