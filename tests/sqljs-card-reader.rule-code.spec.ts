import initSqlJs from 'sql.js';
import { CardDataEntry, YGOProCdb } from 'ygopro-cdb-encode';
import { OcgcoreCommonConstants } from 'ygopro-msg-encode';

import { SqljsCardReader } from '../src/card-reader';
import type { CardReaderFn } from '../src/types/callback';

/**
 * Cards under test:
 *   10000 — original card (alias=0, ruleCode=0)
 *   20000 — reprint of 10000 (distant alias → stored as ruleCode=10000 after parse)
 *   20001 — alt-art of the reprint (alias=20000, should inherit ruleCode=10000)
 *
 * All four topologies for splitting these cards across CDBs must resolve correctly.
 */

const TYPE = OcgcoreCommonConstants.TYPE_MONSTER;

function makeDb(SQL: Awaited<ReturnType<typeof initSqlJs>>, codes: number[]) {
  const db = new YGOProCdb(SQL);
  const entries: CardDataEntry[] = codes.map((code) => {
    if (code === 10000) {
      return new CardDataEntry().fromPartial({ code, type: TYPE });
    }
    if (code === 20000) {
      // ruleCode=10000 → toSqljsRow writes it as alias=10000 in the DB
      return new CardDataEntry().fromPartial({ code, type: TYPE, ruleCode: 10000 });
    }
    // 20001: alt-art of 20000, alias within 20 range
    return new CardDataEntry().fromPartial({ code, type: TYPE, alias: 20000 });
  });
  db.addCard(entries);
  db.noTexts();
  return db;
}

function assertCards(reader: CardReaderFn) {
  const original = reader(10000);
  expect(original).toBeDefined();
  expect(original?.code).toBe(10000);
  expect(original?.alias).toBe(0);
  expect(original?.ruleCode).toBe(0);

  const reprint = reader(20000);
  expect(reprint).toBeDefined();
  expect(reprint?.code).toBe(20000);
  expect(reprint?.alias).toBe(0);
  expect(reprint?.ruleCode).toBe(10000);

  const altArt = reader(20001);
  expect(altArt).toBeDefined();
  expect(altArt?.code).toBe(20001);
  expect(altArt?.alias).toBe(20000);
  expect(altArt?.ruleCode).toBe(10000);
}

describe('SqljsCardReader cross-CDB ruleCode resolve', () => {
  let SQL: Awaited<ReturnType<typeof initSqlJs>>;

  beforeAll(async () => {
    SQL = await initSqlJs();
  });

  afterEach(() => {
    // YGOProCdb instances created per-test are finalized inside each test
  });

  test('topology 1: all 3 cards in one CDB', () => {
    const db = makeDb(SQL, [10000, 20000, 20001]);
    const reader = SqljsCardReader(db) as CardReaderFn;
    assertCards(reader);
    db.finalize();
  });

  test('topology 2: [10000, 20000] in CDB-A, [20001] in CDB-B', () => {
    const dbA = makeDb(SQL, [10000, 20000]);
    const dbB = makeDb(SQL, [20001]);
    const reader = SqljsCardReader(dbA, dbB) as CardReaderFn;
    assertCards(reader);
    dbA.finalize();
    dbB.finalize();
  });

  test('topology 2b: [10000, 20001] in CDB-A, [20000] in CDB-B', () => {
    const dbA = makeDb(SQL, [10000, 20001]);
    const dbB = makeDb(SQL, [20000]);
    const reader = SqljsCardReader(dbA, dbB) as CardReaderFn;
    assertCards(reader);
    dbA.finalize();
    dbB.finalize();
  });

  test('topology 3: [10000] in CDB-A, [20000, 20001] in CDB-B', () => {
    const dbA = makeDb(SQL, [10000]);
    const dbB = makeDb(SQL, [20000, 20001]);
    const reader = SqljsCardReader(dbA, dbB) as CardReaderFn;
    assertCards(reader);
    dbA.finalize();
    dbB.finalize();
  });

  test('topology 4: [10000] in CDB-A, [20000] in CDB-B, [20001] in CDB-C', () => {
    const dbA = makeDb(SQL, [10000]);
    const dbB = makeDb(SQL, [20000]);
    const dbC = makeDb(SQL, [20001]);
    const reader = SqljsCardReader(dbA, dbB, dbC) as CardReaderFn;
    assertCards(reader);
    dbA.finalize();
    dbB.finalize();
    dbC.finalize();
  });
});
