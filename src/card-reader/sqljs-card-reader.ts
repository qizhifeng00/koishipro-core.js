import type { Database, SqlJsStatic } from 'sql.js';
import { OcgcoreCommonConstants } from '../vendor';
import type { CardDataWithText } from '../types/card-data-with-text';
import type { CardReader, CardReaderFn } from '../types/callback';

type SqljsRow = {
  id: number;
  ot: number;
  alias: number;
  setcode: number | bigint;
  type: number;
  atk: number;
  def: number;
  level: number;
  race: number;
  attribute: number;
  category: number;
  name: string | null;
  desc: string | null;
  str1: string | null;
  str2: string | null;
  str3: string | null;
  str4: string | null;
  str5: string | null;
  str6: string | null;
  str7: string | null;
  str8: string | null;
  str9: string | null;
  str10: string | null;
  str11: string | null;
  str12: string | null;
  str13: string | null;
  str14: string | null;
  str15: string | null;
  str16: string | null;
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

function mapRowToCardDataWithText(row: SqljsRow): Partial<CardDataWithText> {
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
    name: row.name ?? '',
    desc: row.desc ?? '',
    strings: [
      row.str1 ?? '',
      row.str2 ?? '',
      row.str3 ?? '',
      row.str4 ?? '',
      row.str5 ?? '',
      row.str6 ?? '',
      row.str7 ?? '',
      row.str8 ?? '',
      row.str9 ?? '',
      row.str10 ?? '',
      row.str11 ?? '',
      row.str12 ?? '',
      row.str13 ?? '',
      row.str14 ?? '',
      row.str15 ?? '',
      row.str16 ?? '',
    ],
  };
}

const SELECT_STMT =
  'SELECT datas.id, datas.ot, datas.alias, datas.setcode, datas.type, datas.atk, datas.def, datas.level, datas.race, datas.attribute, datas.category,' +
  ' texts.name, texts.desc, texts.str1, texts.str2, texts.str3, texts.str4, texts.str5, texts.str6, texts.str7, texts.str8,' +
  ' texts.str9, texts.str10, texts.str11, texts.str12, texts.str13, texts.str14, texts.str15, texts.str16 FROM datas INNER JOIN texts ON datas.id = texts.id';

function queryOne(
  db: Database,
  cardId: number,
): Partial<CardDataWithText> | null {
  if (typeof db.prepare === 'function') {
    const stmt = db.prepare(`${SELECT_STMT} WHERE datas.id = ?`);
    try {
      stmt.bind([cardId]);
      if (!stmt.step()) {
        return null;
      }
      const row = stmt.getAsObject() as unknown as SqljsRow;
      if (!row || row.id == null) {
        return null;
      }
      return mapRowToCardDataWithText(row);
    } finally {
      stmt.free();
    }
  }

  const res = db.exec(`${SELECT_STMT} WHERE datas.id = ${cardId}`);
  if (
    !res ||
    res.length === 0 ||
    !res[0].values ||
    res[0].values.length === 0
  ) {
    return null;
  }
  const row = res[0].values[0] as unknown[];
  return mapRowToCardDataWithText({
    id: row[0] as number,
    ot: row[1] as number,
    alias: row[2] as number,
    setcode: row[3] as number,
    type: row[4] as number,
    atk: row[5] as number,
    def: row[6] as number,
    level: row[7] as number,
    race: row[8] as number,
    attribute: row[9] as number,
    category: row[10] as number,
    name: row[11] as string,
    desc: row[12] as string,
    str1: row[13] as string,
    str2: row[14] as string,
    str3: row[15] as string,
    str4: row[16] as string,
    str5: row[17] as string,
    str6: row[18] as string,
    str7: row[19] as string,
    str8: row[20] as string,
    str9: row[21] as string,
    str10: row[22] as string,
    str11: row[23] as string,
    str12: row[24] as string,
    str13: row[25] as string,
    str14: row[26] as string,
    str15: row[27] as string,
    str16: row[28] as string,
  });
}

function createReader(dbs: Database[]): CardReaderFn {
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

function isSqlJsStatic(value: unknown): value is SqlJsStatic {
  return !!value && typeof (value as SqlJsStatic).Database === 'function';
}

export function SqljsCardReader(...dbs: Database[]): CardReaderFn;
export function SqljsCardReader(
  sqljs: SqlJsStatic,
  ...dbs: Uint8Array[]
): CardReader;
export function SqljsCardReader(
  first: SqlJsStatic | Database,
  ...rest: Array<Database | Uint8Array>
): CardReader {
  if (isSqlJsStatic(first)) {
    const sqljs = first;
    const created = (rest as Uint8Array[]).map((bytes) => new sqljs.Database(bytes));
    const reader = createReader(created);
    return {
      apply: reader,
      finalize: () => {
        for (const db of created) {
          try {
            db.close();
          } catch {
            // ignore close errors
          }
        }
      },
    };
  }

  return createReader([first as Database, ...(rest as Database[])]);
}

/** @deprecated Use SqljsCardReader instead. */
export function createSqljsCardReader(...dbs: Database[]): CardReaderFn;
/** @deprecated Use SqljsCardReader instead. */
export function createSqljsCardReader(
  sqljs: SqlJsStatic,
  ...dbs: Uint8Array[]
): CardReader;
/** @deprecated Use SqljsCardReader instead. */
export function createSqljsCardReader(
  first: SqlJsStatic | Database,
  ...rest: Array<Database | Uint8Array>
): CardReader {
  if (isSqlJsStatic(first)) {
    return SqljsCardReader(first, ...(rest as Uint8Array[]));
  }
  return SqljsCardReader(first as Database, ...(rest as Database[]));
}
