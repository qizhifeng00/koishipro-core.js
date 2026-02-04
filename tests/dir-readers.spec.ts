import fs from 'node:fs';
import path from 'node:path';

import initSqlJs from 'sql.js';

import { createOcgcoreWrapper } from '../src/create-ocgcore-wrapper';
import { playYrp } from '../src/play-yrp';
import { DirScriptReaderEx } from '../src/script-reader';
import { DirCardReader } from '../src/card-reader';

describe('dir readers', () => {
  jest.setTimeout(60000);

  test('plays a replay using DirScriptReaderEx + DirCardReader', async () => {
    const baseDir = process.env.HOME + '/ygo/ygopro';
    if (!fs.existsSync(baseDir)) {
      throw new Error(`Missing ygopro dir: ${baseDir}`);
    }

    const yrpPath = path.join(process.cwd(), 'tests', 'test.yrp');
    if (!fs.existsSync(yrpPath)) {
      throw new Error(`Missing replay file: ${yrpPath}`);
    }

    const wrapper = await createOcgcoreWrapper();
    try {
      wrapper.setScriptReader(await DirScriptReaderEx(baseDir), true);

      const SQL = await initSqlJs();
      wrapper.setCardReader(await DirCardReader(SQL, baseDir), true);

      const yrpBytes = fs.readFileSync(yrpPath);
      const messages = playYrp(wrapper, yrpBytes);
      expect(messages.length).toBeGreaterThan(0);
    } finally {
      wrapper.finalize();
    }
  });
});
