import fs from 'node:fs';
import path from 'node:path';

import { createOcgcoreWrapper } from '../src/create-ocgcore-wrapper';
import { DirReader } from '../src/adapters';
import type { CardData } from '../src/types/card-data';
import { OcgcoreScriptConstants } from '../src/vendor/script-constants';

describe('ocgcore wasm flow', () => {
  jest.setTimeout(30000);

  test('runs a basic duel process loop', async () => {
    const wasmBinary = fs.readFileSync(
      path.join(process.cwd(), 'src', 'vendor', 'wasm_cjs', 'libocgcore.wasm'),
    );
    const wrapper = await createOcgcoreWrapper({ wasmBinary });
    let baseDir = path.join(process.cwd(), 'ygopro-scripts');
    if (!fs.existsSync(baseDir)) {
      const fallback = '/home/nanahira/ygo/ygopro/script';
      if (fs.existsSync(fallback)) {
        baseDir = fallback;
      } else {
        return;
      }
    }

    wrapper.setScriptReader(DirReader(baseDir));

    wrapper.setCardReader(
      (cardId): CardData => ({
        code: cardId,
        alias: 0,
        setcode: new Uint16Array(16),
        type: 0x1 | 0x20,
        level: 4,
        attribute: 1,
        race: 1,
        attack: 2000,
        defense: 1500,
        lscale: 0,
        rscale: 0,
        linkMarker: 0,
      }),
    );

    const duel = wrapper.createDuel(23452322);

    duel.preloadScript('./script/constant.lua');
    duel.preloadScript('./script/utility.lua');
    duel.preloadScript('./script/procedure.lua');

    duel.setPlayerInfo({ playerId: 0, lp: 8000, startCount: 5, drawCount: 1 });
    duel.setPlayerInfo({ playerId: 1, lp: 8000, startCount: 5, drawCount: 1 });

    duel.newCard({
      code: 10000,
      owner: 0,
      playerId: 0,
      location: OcgcoreScriptConstants.LOCATION_DECK,
      sequence: 0,
      position: OcgcoreScriptConstants.POS_FACEUP_ATTACK,
    });

    duel.startDuel((5 << 16) >>> 0);

    const responses: Array<number> = [7, -1];
    let iterations = 0;
    while (iterations < 100) {
      iterations++;
      const { status } = duel.process();
      if (status === 2) {
        break;
      }
      if (status === 1) {
        const response = responses.shift();
        if (response === undefined) {
          break;
        }
        duel.setResponseInt(response);
      }
    }

    duel.endDuel();
    wrapper.finalize();

    expect(iterations).toBeGreaterThan(0);
  });
});
