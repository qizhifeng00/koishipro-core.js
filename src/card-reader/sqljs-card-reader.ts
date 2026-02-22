import type { Database, SqlJsStatic } from 'sql.js';
import { YGOProCdb } from 'ygopro-cdb-encode';
import type { CardReaderFinalized, CardReaderFn } from '../types/callback';

function createReader(dbs: YGOProCdb[]): CardReaderFn {
  const brokenDbIndexes = new Set<number>();
  return (cardId: number) => {
    for (let i = 0; i < dbs.length; i++) {
      if (brokenDbIndexes.has(i)) {
        continue;
      }
      const db = dbs[i];
      let data;
      try {
        data = db.findById(cardId);
      } catch {
        brokenDbIndexes.add(i);
        continue;
      }
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

export function SqljsCardReader(
  ...dbs: Array<Database | YGOProCdb>
): CardReaderFn;
export function SqljsCardReader(
  sqljs: SqlJsStatic,
  ...dbs: Array<Uint8Array | YGOProCdb | Database>
): CardReaderFinalized;
export function SqljsCardReader(
  first: SqlJsStatic | Database | YGOProCdb,
  ...rest: Array<Database | Uint8Array | YGOProCdb>
): CardReaderFn | CardReaderFinalized {
  if (isSqlJsStatic(first)) {
    const sqljs = first;
    const owned: YGOProCdb[] = [];
    const dbs = rest.map((item) => {
      if (item instanceof YGOProCdb) {
        return item;
      }
      if (item instanceof Uint8Array) {
        const cdb = new YGOProCdb(sqljs).from(item);
        owned.push(cdb);
        return cdb;
      }
      return new YGOProCdb(item as Database);
    });
    owned.forEach((db) => db.noTexts());
    const reader = createReader(dbs);
    return {
      apply: reader,
      finalize: () => {
        for (const db of owned) {
          try {
            db.finalize();
          } catch {
            // ignore close errors
          }
        }
      },
    };
  }

  const inputs = [first, ...rest];
  const dbs = inputs.map((item) => {
    if (item instanceof YGOProCdb) {
      return item;
    }
    if (item instanceof Uint8Array) {
      throw new Error(
        'SqlJsStatic is required to create database from Uint8Array',
      );
    }
    return new YGOProCdb(item as Database);
  });
  return createReader(dbs);
}

/** @deprecated Use SqljsCardReader instead. */
export function createSqljsCardReader(
  ...dbs: Array<Database | YGOProCdb>
): CardReaderFn;
/** @deprecated Use SqljsCardReader instead. */
export function createSqljsCardReader(
  sqljs: SqlJsStatic,
  ...dbs: Array<Uint8Array | YGOProCdb | Database>
): CardReaderFinalized;
/** @deprecated Use SqljsCardReader instead. */
export function createSqljsCardReader(
  first: SqlJsStatic | Database | YGOProCdb,
  ...rest: Array<Database | Uint8Array | YGOProCdb>
): CardReaderFn | CardReaderFinalized {
  if (isSqlJsStatic(first)) {
    return SqljsCardReader(first, ...(rest as Array<Uint8Array | YGOProCdb>));
  }
  return SqljsCardReader(first as Database, ...(rest as Database[]));
}
