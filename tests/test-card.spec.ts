import fs from 'node:fs';
import path from 'node:path';

import initSqlJs from 'sql.js';

import { createOcgcoreWrapper } from '../src/create-ocgcore-wrapper';
import { DirScriptReader } from '../src/script-reader';
import { SqljsCardReader } from '../src/card-reader';
import { testCard } from '../src/test-card';
import { OcgcoreMessageType } from '../src/types/ocgcore-enums';

function resolveProjectFile(relativePath: string): string {
  return path.join(process.env.HOME, 'ygo', 'ygopro', relativePath);
}

describe('testCard', () => {
  jest.setTimeout(60000);

  test('runs card 10000 without script errors', async () => {
    const scriptDir = resolveProjectFile('script');
    const cardsPath = resolveProjectFile('cards.cdb');
    if (!fs.existsSync(scriptDir)) {
      throw new Error(`Missing script dir: ${scriptDir}`);
    }
    if (!fs.existsSync(cardsPath)) {
      throw new Error(`Missing cards db: ${cardsPath}`);
    }

    const wasmBinary = fs.readFileSync('src/vendor/wasm_cjs/libocgcore.wasm');
    const wrapper = await createOcgcoreWrapper({ wasmBinary });
    try {
      wrapper.setScriptReader(DirScriptReader(scriptDir), true);
      const SQL = await initSqlJs();
      const db = new SQL.Database(fs.readFileSync(cardsPath));
      wrapper.setCardReader(SqljsCardReader(db), true);

      const logs = testCard(wrapper, 10000);
      const hasError = logs.some(
        (entry) => entry.type === OcgcoreMessageType.ScriptError,
      );
      expect(hasError).toBe(false);
    } finally {
      wrapper.finalize();
    }
  });

  test('fails when card script throws error', async () => {
    const scriptDir = resolveProjectFile('script');
    const cardsPath = resolveProjectFile('cards.cdb');
    if (!fs.existsSync(scriptDir)) {
      throw new Error(`Missing script dir: ${scriptDir}`);
    }
    if (!fs.existsSync(cardsPath)) {
      throw new Error(`Missing cards db: ${cardsPath}`);
    }

    const wasmBinary = fs.readFileSync('src/vendor/wasm_cjs/libocgcore.wasm');
    const wrapper = await createOcgcoreWrapper({ wasmBinary });
    try {
      const badReader = (scriptPath: string) => {
        const match = /c(\d+)\.lua$/i.exec(scriptPath.replace(/\\\\/g, '/'));
        if (!match) {
          return null;
        }
        const code = Number(match[1]);
        return `function c${code}.initial_effect(c)\n  error('message here')\nend`;
      };

      wrapper
        .setScriptReader(badReader, true)
        .setScriptReader(DirScriptReader(scriptDir));

      const SQL = await initSqlJs();
      const db = new SQL.Database(fs.readFileSync(cardsPath));
      wrapper.setCardReader(SqljsCardReader(db), true);

      const logs = testCard(wrapper, 10000);
      const errorLogs = logs.filter(
        (entry) => entry.type === OcgcoreMessageType.ScriptError,
      );
      const hasMessage = errorLogs.some((entry) =>
        entry.message.includes('message here'),
      );
      expect(hasMessage).toBe(true);
    } finally {
      wrapper.finalize();
    }
  });
});
