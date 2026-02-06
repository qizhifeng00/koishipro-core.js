import type { Database } from 'sql.js';
import { OcgcoreCommonConstants } from '../vendor';
import type { CardData } from 'ygopro-msg-encode';
import type { CardReader } from '../types/callback';

type SqljsRow = {
  id: number;
  alias: number;
  setcode: number | bigint;
  type: number;
  atk: number;
  def: number;
  level: number;
  race: number;
  attribute: number;
};

function toNumberArrayFromSetcode(value: number | bigint): number[] {
  let raw = typeof value === 'bigint' ? value : BigInt(value >>> 0);
  const list: number[] = [];
  while (raw !== 0n && list.length < 16) {
    const chunk = raw & 0xffffn;
    if (chunk !== 0n) {
      list.push(Number(chunk));
    }
    raw >>= 16n;
  }
  return list;
}

function mapRowToCardData(row: SqljsRow): Partial<CardData> {
  const type = (row.type ?? 0) >>> 0;
  const attack = row.atk ?? 0;
  let defense = row.def ?? 0;
  let linkMarker = 0;
  if ((type & OcgcoreCommonConstants.TYPE_LINK) >>> 0 !== 0) {
    linkMarker = defense;
    defense = 0;
  }
  const levelRaw = (row.level ?? 0) >>> 0;
  const level = (levelRaw & 0xff) >>> 0;
  const lscale = ((levelRaw >>> 24) & 0xff) >>> 0;
  const rscale = ((levelRaw >>> 16) & 0xff) >>> 0;

  return {
    code: row.id,
    alias: row.alias ?? 0,
    setcode: toNumberArrayFromSetcode(row.setcode ?? 0),
    type,
    level,
    attribute: (row.attribute ?? 0) >>> 0,
    race: (row.race ?? 0) >>> 0,
    attack,
    defense,
    lscale,
    rscale,
    linkMarker,
  };
}

function queryOne(db: Database, cardId: number): Partial<CardData> | null {
  if (typeof db.prepare === 'function') {
    const stmt = db.prepare(
      'SELECT id, alias, setcode, type, atk, def, level, race, attribute FROM datas WHERE id = ?',
    );
    try {
      stmt.bind([cardId]);
      if (!stmt.step()) {
        return null;
      }
      const row = stmt.getAsObject() as unknown as SqljsRow;
      if (!row || row.id == null) {
        return null;
      }
      return mapRowToCardData(row);
    } finally {
      stmt.free();
    }
  }

  const res = db.exec(
    `SELECT id, alias, setcode, type, atk, def, level, race, attribute FROM datas WHERE id = ${cardId}`,
  );
  if (
    !res ||
    res.length === 0 ||
    !res[0].values ||
    res[0].values.length === 0
  ) {
    return null;
  }
  const row = res[0].values[0] as unknown[];
  return mapRowToCardData({
    id: row[0] as number,
    alias: row[1] as number,
    setcode: row[2] as number,
    type: row[3] as number,
    atk: row[4] as number,
    def: row[5] as number,
    level: row[6] as number,
    race: row[7] as number,
    attribute: row[8] as number,
  });
}

export function SqljsCardReader(...dbs: Database[]): CardReader {
  return (cardId: number) => {
    for (const db of dbs) {
      const data = queryOne(db, cardId);
      if (data) {
        return data;
      }
    }
    return null;
  };
}

/** @deprecated Use SqljsCardReader instead. */
export function createSqljsCardReader(...dbs: Database[]): CardReader {
  return SqljsCardReader(...dbs);
}
