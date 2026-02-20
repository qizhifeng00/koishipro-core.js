import initSqlJs from 'sql.js';
import { CardDataEntry, YGOProCdb } from 'ygopro-cdb-encode';

import { SqljsCardReader } from '../src/card-reader';
import { OcgcoreWrapper } from '../src/ocgcore-wrapper';
import type { OcgcoreModule } from '../src/vendor/libocgcore.shared';

function createMockModule(): OcgcoreModule {
  const heap = new Uint8Array(1024 * 1024);
  let nextPtr = 8;
  let nextFn = 1;
  const module: Partial<OcgcoreModule> = {
    HEAPU8: heap as unknown as OcgcoreModule['HEAPU8'],
    _malloc: (size: number) => {
      const ptr = nextPtr;
      nextPtr += size;
      return ptr;
    },
    _free: () => {},
    addFunction: () => nextFn++,
    removeFunction: () => {},
    _set_script_reader: () => {},
    _set_card_reader: () => {},
    _set_message_handler: () => {},
    _default_script_reader: () => 0,
    _create_duel: () => 1,
    _create_duel_v2: () => 1,
    _start_duel: () => {},
    _end_duel: () => {},
    _set_player_info: () => {},
    _get_log_message: () => 0,
    _get_message: () => 0,
    _process: () => 0,
    _new_card: () => {},
    _new_tag_card: () => {},
    _query_card: () => 0,
    _query_field_count: () => 0,
    _query_field_card: () => 0,
    _query_field_info: () => 0,
    _set_responsei: () => {},
    _set_responseb: () => {},
    _preload_script: () => {},
    _get_registry_value: () => 0,
    _set_registry_value: () => {},
    _get_registry_keys: () => 0,
    _clear_registry: () => {},
    _dump_registry: () => 0,
    _load_registry: () => {},
    ___stdio_exit: () => {},
  };
  return module as OcgcoreModule;
}

describe('SqljsCardReader specials', () => {
  test('keeps original setcode in raw reader output', async () => {
    const SQL = await initSqlJs();
    const cdb = new YGOProCdb(SQL);
    const baseSetcode = [1, 2, 3, 4];
    const specialSetcode = [0x8f, 0x54, 0x59, 0x82, 0x13a];
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
    const rawSetcode = reader(targetCodes[0])?.setcode;
    for (const code of targetCodes) {
      expect(reader(code)?.setcode).toEqual(rawSetcode);
      expect(reader(code)?.setcode).not.toEqual(specialSetcode);
    }

    cdb.finalize();
  });

  test('overrides setcode in OcgcoreWrapper layer', async () => {
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

    const wrapper = new OcgcoreWrapper(createMockModule());
    wrapper.setCardReader(SqljsCardReader(cdb), true);
    for (const code of targetCodes) {
      expect(wrapper.readCard(code)?.setcode).toEqual(expectedSetcode);
    }

    wrapper.finalize();
    cdb.finalize();
  });
});
