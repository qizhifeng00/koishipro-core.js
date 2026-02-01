import fs from 'node:fs';
import path from 'node:path';

import initSqlJs from 'sql.js';

import { createOcgcoreWrapper } from '../src/create-ocgcore-wrapper';
import { playYrp } from '../src/play-yrp';
import { DirReader } from '../src/adapters';
import { createSqljsCardReader } from '../src/sqljs-card-reader';
import { OcgcoreCommonConstants } from '../src/vendor/ocgcore-constants';

describe('playYrp', () => {
  jest.setTimeout(60000);

  test('plays a yrp replay and yields MSG_NEW_TURN messages', async () => {
    const scriptDir = path.join(process.cwd(), 'ygopro-scripts');
    if (!fs.existsSync(scriptDir)) {
      throw new Error(`Missing script dir: ${scriptDir}`);
    }

    const cardsPath = path.join(process.cwd(), 'cards.cdb');
    if (!fs.existsSync(cardsPath)) {
      throw new Error(`Missing cards db: ${cardsPath}`);
    }

    const yrpPath = path.join(process.cwd(), 'tests', 'test.yrp');
    if (!fs.existsSync(yrpPath)) {
      throw new Error(`Missing replay file: ${yrpPath}`);
    }

    const wasmBinary = fs.readFileSync(
      path.join(process.cwd(), 'src', 'vendor', 'wasm_cjs', 'libocgcore.wasm'),
    );
    const wrapper = await createOcgcoreWrapper({ wasmBinary });

    try {
      wrapper.setScriptReader(DirReader(scriptDir));

      const SQL = await initSqlJs();
      const db = new SQL.Database(fs.readFileSync(cardsPath));
      wrapper.setCardReader(createSqljsCardReader(db));

      wrapper.setMessageHandler((_duel, message, type) => {
        throw new Error(`MessageHandler invoked (${type}): ${message}`);
      });

      const yrpBytes = fs.readFileSync(yrpPath);
      const messages = playYrp(wrapper, new Uint8Array(yrpBytes));
      const newTurnCount = messages.filter(
        (msg) => msg.length > 0 && msg[0] === OcgcoreCommonConstants.MSG_NEW_TURN,
      ).length;

      expect(newTurnCount).toBeGreaterThanOrEqual(2);
    } finally {
      wrapper.finalize();
    }
  });
});
