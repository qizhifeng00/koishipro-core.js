import initSqlJs from 'sql.js';
import { CardDataEntry, YGOProCdb } from 'ygopro-cdb-encode';

import { SqljsCardReader } from '../src/card-reader';

describe('SqljsCardReader specials', () => {
  test('overrides setcode with full extra_setcode list', async () => {
    const SQL = await initSqlJs();
    const cdb = new YGOProCdb(SQL);
    const baseSetcode = [1, 2, 3, 4];
    const expectedSetcode = [0x8f, 0x54, 0x59, 0x82, 0x13a];
    const targetCodes = [8512558, 55088578];

    cdb.addCard(
      targetCodes.map((code) =>
        new CardDataEntry().fromPartial({
          code,
          setcode: baseSetcode,
        }),
      ),
    );

    const reader = SqljsCardReader(cdb);
    for (const code of targetCodes) {
      expect(reader(code)?.setcode).toEqual(expectedSetcode);
    }

    cdb.finalize();
  });
});
