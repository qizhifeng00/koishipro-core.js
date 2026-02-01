import {
  OcgcoreCardInfo,
  OcgcoreCardLocationRef,
  OcgcoreCounterInfo,
  OcgcoreFieldInfo,
  OcgcoreFieldInfoChain,
  OcgcoreFieldInfoPlayerState,
  OcgcoreRegistryDumpEntry,
} from '../types/ocgcore-results';
import { LEN_HEADER } from '../constants';
import { OcgcoreCommonConstants } from '../vendor/ocgcore-constants';
import { readI32, readU16, readU32, readU8 } from '../utility/binary';
import { decodeUtf8 } from '../utility/utf8';

function parseCardInfo(payload: Uint8Array): OcgcoreCardInfo {
  let offset = 0;
  const flags = readI32(payload, offset) >>> 0;
  offset += 4;
  const info: OcgcoreCardInfo = { flags, empty: flags === 0 };
  if (flags === 0) {
    return info;
  }

  if (flags & OcgcoreCommonConstants.QUERY_CODE) {
    info.code = readI32(payload, offset);
    offset += 4;
  }
  if (flags & OcgcoreCommonConstants.QUERY_POSITION) {
    const pdata = readI32(payload, offset);
    offset += 4;
    info.position = ((pdata >>> 24) & 0xff) >>> 0;
  }
  if (flags & OcgcoreCommonConstants.QUERY_ALIAS) {
    info.alias = readI32(payload, offset);
    offset += 4;
  }
  if (flags & OcgcoreCommonConstants.QUERY_TYPE) {
    info.type = readI32(payload, offset);
    offset += 4;
  }
  if (flags & OcgcoreCommonConstants.QUERY_LEVEL) {
    info.level = readI32(payload, offset);
    offset += 4;
  }
  if (flags & OcgcoreCommonConstants.QUERY_RANK) {
    info.rank = readI32(payload, offset);
    offset += 4;
  }
  if (flags & OcgcoreCommonConstants.QUERY_ATTRIBUTE) {
    info.attribute = readI32(payload, offset);
    offset += 4;
  }
  if (flags & OcgcoreCommonConstants.QUERY_RACE) {
    info.race = readI32(payload, offset);
    offset += 4;
  }
  if (flags & OcgcoreCommonConstants.QUERY_ATTACK) {
    info.attack = readI32(payload, offset);
    offset += 4;
  }
  if (flags & OcgcoreCommonConstants.QUERY_DEFENSE) {
    info.defense = readI32(payload, offset);
    offset += 4;
  }
  if (flags & OcgcoreCommonConstants.QUERY_BASE_ATTACK) {
    info.baseAttack = readI32(payload, offset);
    offset += 4;
  }
  if (flags & OcgcoreCommonConstants.QUERY_BASE_DEFENSE) {
    info.baseDefense = readI32(payload, offset);
    offset += 4;
  }
  if (flags & OcgcoreCommonConstants.QUERY_REASON) {
    info.reason = readI32(payload, offset);
    offset += 4;
  }
  if (flags & OcgcoreCommonConstants.QUERY_REASON_CARD) {
    offset += 4;
  }
  if (flags & OcgcoreCommonConstants.QUERY_EQUIP_CARD) {
    const controller = readU8(payload, offset) >>> 0;
    const location = readU8(payload, offset + 1) >>> 0;
    const sequence = readU8(payload, offset + 2) >>> 0;
    info.equipCard = { controller, location, sequence };
    offset += 4;
  }
  if (flags & OcgcoreCommonConstants.QUERY_TARGET_CARD) {
    const count = readI32(payload, offset);
    offset += 4;
    const targets: OcgcoreCardLocationRef[] = [];
    for (let i = 0; i < count; i++) {
      const controller = readU8(payload, offset) >>> 0;
      const location = readU8(payload, offset + 1) >>> 0;
      const sequence = readU8(payload, offset + 2) >>> 0;
      targets.push({ controller, location, sequence });
      offset += 4;
    }
    info.targetCards = targets;
  }
  if (flags & OcgcoreCommonConstants.QUERY_OVERLAY_CARD) {
    const count = readI32(payload, offset);
    offset += 4;
    const overlay: number[] = [];
    for (let i = 0; i < count; i++) {
      overlay.push(readI32(payload, offset));
      offset += 4;
    }
    info.overlayCards = overlay;
  }
  if (flags & OcgcoreCommonConstants.QUERY_COUNTERS) {
    const count = readI32(payload, offset);
    offset += 4;
    const counters: OcgcoreCounterInfo[] = [];
    for (let i = 0; i < count; i++) {
      const type = readU16(payload, offset) >>> 0;
      const ccount = readU16(payload, offset + 2) >>> 0;
      counters.push({ type, count: ccount });
      offset += 4;
    }
    info.counters = counters;
  }
  if (flags & OcgcoreCommonConstants.QUERY_OWNER) {
    info.owner = readI32(payload, offset);
    offset += 4;
  }
  if (flags & OcgcoreCommonConstants.QUERY_STATUS) {
    info.status = readI32(payload, offset);
    offset += 4;
  }
  if (flags & OcgcoreCommonConstants.QUERY_LSCALE) {
    info.lscale = readI32(payload, offset);
    offset += 4;
  }
  if (flags & OcgcoreCommonConstants.QUERY_RSCALE) {
    info.rscale = readI32(payload, offset);
    offset += 4;
  }
  if (flags & OcgcoreCommonConstants.QUERY_LINK) {
    info.link = readI32(payload, offset);
    offset += 4;
    info.linkMarker = readI32(payload, offset);
    offset += 4;
  }
  return info;
}

export function parseCardQuery(
  raw: Uint8Array,
  length: number,
): OcgcoreCardInfo | null {
  if (length <= LEN_HEADER) {
    return null;
  }
  const payload = raw.subarray(4, length);
  return parseCardInfo(payload);
}

export function parseFieldCardQuery(
  raw: Uint8Array,
  length: number,
): OcgcoreCardInfo[] {
  const cards: OcgcoreCardInfo[] = [];
  let offset = 0;
  while (offset + 4 <= length) {
    const chunkLen = readI32(raw, offset);
    if (chunkLen <= 0) {
      break;
    }
    const end = Math.min(length, offset + chunkLen);
    if (chunkLen <= LEN_HEADER) {
      cards.push({ flags: 0, empty: true });
    } else {
      const payload = raw.subarray(offset + 4, end);
      cards.push(parseCardInfo(payload));
    }
    offset += chunkLen;
  }
  return cards;
}

export function parseFieldInfo(raw: Uint8Array): OcgcoreFieldInfo {
  let offset = 0;
  const message = readU8(raw, offset++) >>> 0;
  const duelRule = readU8(raw, offset++) >>> 0;
  const players = [] as unknown as [
    OcgcoreFieldInfoPlayerState,
    OcgcoreFieldInfoPlayerState,
  ];

  for (let i = 0; i < 2; i++) {
    const lp = readI32(raw, offset) >>> 0;
    offset += 4;
    const mzone: OcgcoreFieldInfoPlayerState['mzone'] = [];
    for (let seq = 0; seq < 7; seq++) {
      const occupied = readU8(raw, offset++) >>> 0 !== 0;
      if (occupied) {
        const position = readU8(raw, offset++) >>> 0;
        const xyzCount = readU8(raw, offset++) >>> 0;
        mzone.push({ occupied, position, xyzCount });
      } else {
        mzone.push({ occupied });
      }
    }
    const szone: OcgcoreFieldInfoPlayerState['szone'] = [];
    for (let seq = 0; seq < 8; seq++) {
      const occupied = readU8(raw, offset++) >>> 0 !== 0;
      if (occupied) {
        const position = readU8(raw, offset++) >>> 0;
        szone.push({ occupied, position });
      } else {
        szone.push({ occupied });
      }
    }
    const deckCount = readU8(raw, offset++) >>> 0;
    const handCount = readU8(raw, offset++) >>> 0;
    const graveCount = readU8(raw, offset++) >>> 0;
    const removedCount = readU8(raw, offset++) >>> 0;
    const extraCount = readU8(raw, offset++) >>> 0;
    const extraPCount = readU8(raw, offset++) >>> 0;
    players[i] = {
      lp,
      mzone,
      szone,
      deckCount,
      handCount,
      graveCount,
      removedCount,
      extraCount,
      extraPCount,
    };
  }

  const chainCount = readU8(raw, offset++) >>> 0;
  const chains: OcgcoreFieldInfoChain[] = [];
  for (let i = 0; i < chainCount; i++) {
    const code = readU32(raw, offset) >>> 0;
    offset += 4;
    const infoLocation = readU32(raw, offset) >>> 0;
    offset += 4;
    const chainCard = {
      controller: (infoLocation & 0xff) >>> 0,
      location: ((infoLocation >>> 8) & 0xff) >>> 0,
      sequence: ((infoLocation >>> 16) & 0xff) >>> 0,
      subSequence: ((infoLocation >>> 24) & 0xff) >>> 0,
    };
    const trigger = {
      controller: readU8(raw, offset++) >>> 0,
      location: readU8(raw, offset++) >>> 0,
      sequence: readU8(raw, offset++) >>> 0,
    };
    const description = readU32(raw, offset) >>> 0;
    offset += 4;
    chains.push({ code, chainCard, trigger, description });
  }

  return { message, duelRule, players, chains };
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

export function parseRegistryDump(raw: Uint8Array): OcgcoreRegistryDumpEntry[] {
  const entries: OcgcoreRegistryDumpEntry[] = [];
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
    const entry: OcgcoreRegistryDumpEntry = {
      key: decodeUtf8(keyBytes),
      value: valueBytes,
    };
    entry.valueText = decodeUtf8(valueBytes);
    entries.push(entry);
  }
  return entries;
}
