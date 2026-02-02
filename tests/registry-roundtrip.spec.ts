import { createOcgcoreWrapper } from '../src/create-ocgcore-wrapper';

describe('Registry Round-trip Tests', () => {
  jest.setTimeout(30000);

  test('dict perfectly round-trips through dump and load', async () => {
    const wrapper = await createOcgcoreWrapper();

    try {
      const duel1 = wrapper.createDuel(12345);
      duel1.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
      duel1.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });

      // Original data
      const originalDict = {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
        numeric_key: '12345',
        empty_value: '',
        special_chars: 'hello world! @#$%',
      };

      // Set all values
      for (const [key, value] of Object.entries(originalDict)) {
        duel1.setRegistryValue(key, value);
      }

      // Dump to dict
      const dump1 = duel1.dumpRegistry();

      // Verify dump contains all keys
      for (const key of Object.keys(originalDict)) {
        expect(dump1.dict).toHaveProperty(key);
        expect(dump1.dict[key]).toBe(originalDict[key]);
      }

      duel1.endDuel();

      // Load into new duel using dict
      const duel2 = wrapper.createDuel(67890);
      duel2.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
      duel2.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });
      duel2.loadRegistry(dump1.dict);

      // Dump again and verify
      const dump2 = duel2.dumpRegistry();

      // Both dicts should be identical
      expect(dump2.dict).toEqual(dump1.dict);

      // Verify all original values
      for (const [key, value] of Object.entries(originalDict)) {
        expect(dump2.dict[key]).toBe(value);
      }

      duel2.endDuel();
    } finally {
      wrapper.finalize();
    }
  });

  test('dict round-trips with UTF-8 and special characters', async () => {
    const wrapper = await createOcgcoreWrapper();

    try {
      const duel1 = wrapper.createDuel(12345);
      duel1.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
      duel1.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });

      // Test with various special characters
      const originalDict = {
        utf8_chinese: '你好世界',
        utf8_japanese: 'こんにちは',
        utf8_emoji: '🎮🃏🎴',
        newlines: 'line1\nline2\nline3',
        tabs: 'col1\tcol2\tcol3',
        quotes: 'single\'quotes"double',
        mixed: 'Hello 世界 🌏!',
      };

      // Set values
      for (const [key, value] of Object.entries(originalDict)) {
        duel1.setRegistryValue(key, value);
      }

      // Dump
      const dump1 = duel1.dumpRegistry();

      // Verify dump
      for (const [key, value] of Object.entries(originalDict)) {
        expect(dump1.dict[key]).toBe(value);
      }

      duel1.endDuel();

      // Load into new duel
      const duel2 = wrapper.createDuel(67890);
      duel2.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
      duel2.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });
      duel2.loadRegistry(dump1.dict);

      // Verify all values individually
      for (const [key, expectedValue] of Object.entries(originalDict)) {
        const result = duel2.getRegistryValue(key);
        expect(result.text).toBe(expectedValue);
      }

      // Dump again and verify complete equality
      const dump2 = duel2.dumpRegistry();
      expect(dump2.dict).toEqual(dump1.dict);
      expect(dump2.dict).toEqual(originalDict);

      duel2.endDuel();
    } finally {
      wrapper.finalize();
    }
  });

  test('dict round-trips through binary format', async () => {
    const wrapper = await createOcgcoreWrapper();

    try {
      const duel1 = wrapper.createDuel(12345);
      duel1.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
      duel1.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });

      // Original data
      const originalDict = {
        player_name: 'Alice',
        duel_mode: 'match',
        start_lp: '8000',
        turn_count: '42',
      };

      // Set values
      for (const [key, value] of Object.entries(originalDict)) {
        duel1.setRegistryValue(key, value);
      }

      // Dump to binary
      const dump1 = duel1.dumpRegistry();
      expect(dump1.dict).toEqual(originalDict);

      duel1.endDuel();

      // Load from binary into new duel
      const duel2 = wrapper.createDuel(67890);
      duel2.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
      duel2.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });
      duel2.loadRegistry(dump1.raw); // Load from binary

      // Dump again
      const dump2 = duel2.dumpRegistry();

      // Dict should be identical
      expect(dump2.dict).toEqual(dump1.dict);
      expect(dump2.dict).toEqual(originalDict);

      duel2.endDuel();
    } finally {
      wrapper.finalize();
    }
  });

  test('multiple round-trips preserve data integrity', async () => {
    const wrapper = await createOcgcoreWrapper();

    try {
      const originalDict = {
        test1: 'value1',
        test2: 'value2',
        test3: 'special 特殊字符 🎮',
      };

      let currentDict: Record<string, string> = { ...originalDict };

      // Perform 5 round-trips
      for (let i = 0; i < 5; i++) {
        const duel = wrapper.createDuel(12345 + i);
        duel.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
        duel.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });

        // Load from dict
        duel.loadRegistry(currentDict);

        // Dump to dict
        const dump = duel.dumpRegistry();

        // Verify no data loss
        expect(dump.dict).toEqual(originalDict);

        currentDict = dump.dict;
        duel.endDuel();
      }

      // After 5 round-trips, data should still be identical
      expect(currentDict).toEqual(originalDict);
    } finally {
      wrapper.finalize();
    }
  });

  test('empty dict round-trips correctly', async () => {
    const wrapper = await createOcgcoreWrapper();

    try {
      const duel1 = wrapper.createDuel(12345);
      duel1.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
      duel1.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });

      // Dump empty registry
      const dump1 = duel1.dumpRegistry();
      expect(Object.keys(dump1.dict).length).toBe(0);

      duel1.endDuel();

      // Load empty dict
      const duel2 = wrapper.createDuel(67890);
      duel2.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
      duel2.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });
      duel2.loadRegistry(dump1.dict);

      // Should still be empty
      const dump2 = duel2.dumpRegistry();
      expect(Object.keys(dump2.dict).length).toBe(0);
      expect(dump2.dict).toEqual({});

      duel2.endDuel();
    } finally {
      wrapper.finalize();
    }
  });

  test('large dataset round-trips without data loss', async () => {
    const wrapper = await createOcgcoreWrapper();

    try {
      const duel1 = wrapper.createDuel(12345);
      duel1.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
      duel1.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });

      // Create a large dataset
      const originalDict: Record<string, string> = {};
      for (let i = 0; i < 50; i++) {
        originalDict[`key_${i}`] = `value_${i}_with_some_text`;
      }

      // Add some special cases
      originalDict['utf8_test'] = '测试中文 🎮';
      originalDict['empty'] = '';
      originalDict['long_value'] = 'x'.repeat(100);

      // Set all values
      for (const [key, value] of Object.entries(originalDict)) {
        duel1.setRegistryValue(key, value);
      }

      // Dump
      const dump1 = duel1.dumpRegistry();
      expect(Object.keys(dump1.dict).length).toBe(
        Object.keys(originalDict).length,
      );

      duel1.endDuel();

      // Load into new duel
      const duel2 = wrapper.createDuel(67890);
      duel2.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
      duel2.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });
      duel2.loadRegistry(dump1.dict);

      // Dump again
      const dump2 = duel2.dumpRegistry();

      // Verify all keys and values
      expect(Object.keys(dump2.dict).length).toBe(
        Object.keys(originalDict).length,
      );
      expect(dump2.dict).toEqual(originalDict);

      duel2.endDuel();
    } finally {
      wrapper.finalize();
    }
  });
});
