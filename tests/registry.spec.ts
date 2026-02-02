import { createOcgcoreWrapper } from '../src/create-ocgcore-wrapper';

describe('Registry', () => {
  jest.setTimeout(30000);

  test('sets and gets registry values', async () => {
    const wrapper = await createOcgcoreWrapper();

    try {
      const duel = wrapper.createDuel(12345);

      // Initialize duel
      duel.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
      duel.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });

      // Set some values
      duel.setRegistryValue('test_key_1', 'test_value_1');
      duel.setRegistryValue('test_key_2', 'test_value_2');
      duel.setRegistryValue('number_test', '42');

      // Get values back
      const value1 = duel.getRegistryValue('test_key_1');
      expect(value1.text).toBe('test_value_1');
      expect(value1.value).toBeInstanceOf(Uint8Array);

      const value2 = duel.getRegistryValue('test_key_2');
      expect(value2.text).toBe('test_value_2');

      const value3 = duel.getRegistryValue('number_test');
      expect(value3.text).toBe('42');

      // Test non-existent key returns negative length
      const nonExistent = duel.getRegistryValue('non_existent_key_xxx');
      expect(nonExistent.length).toBeLessThan(0);

      duel.endDuel();
    } finally {
      wrapper.finalize();
    }
  });

  test('lists registry keys', async () => {
    const wrapper = await createOcgcoreWrapper();

    try {
      const duel = wrapper.createDuel(12345);

      // Initialize duel
      duel.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
      duel.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });

      // Set multiple values
      duel.setRegistryValue('key_a', 'value_a');
      duel.setRegistryValue('key_b', 'value_b');
      duel.setRegistryValue('key_c', 'value_c');

      // Get all keys
      const keysResult = duel.getRegistryKeys();
      expect(keysResult.keys).toContain('key_a');
      expect(keysResult.keys).toContain('key_b');
      expect(keysResult.keys).toContain('key_c');
      expect(keysResult.keys.length).toBeGreaterThanOrEqual(3);

      duel.endDuel();
    } finally {
      wrapper.finalize();
    }
  });

  test('dumps and loads registry with binary format', async () => {
    const wrapper = await createOcgcoreWrapper();

    try {
      // First duel: set values and dump
      const duel1 = wrapper.createDuel(12345);
      duel1.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
      duel1.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });

      duel1.setRegistryValue('persistent_key_1', 'persistent_value_1');
      duel1.setRegistryValue('persistent_key_2', 'persistent_value_2');
      duel1.setRegistryValue('duel_mode', 'match');

      const dumpResult = duel1.dumpRegistry();
      expect(dumpResult.dict).toBeDefined();
      expect(Object.keys(dumpResult.dict).length).toBeGreaterThan(0);

      // Verify dict
      expect(dumpResult.dict['persistent_key_1']).toBe('persistent_value_1');
      expect(dumpResult.dict['persistent_key_2']).toBe('persistent_value_2');
      expect(dumpResult.dict['duel_mode']).toBe('match');

      duel1.endDuel();

      // Second duel: load from binary dump
      const duel2 = wrapper.createDuel(67890);
      duel2.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
      duel2.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });
      duel2.loadRegistry(dumpResult.raw);

      // Verify values are restored
      const restored1 = duel2.getRegistryValue('persistent_key_1');
      expect(restored1.text).toBe('persistent_value_1');

      const restored2 = duel2.getRegistryValue('persistent_key_2');
      expect(restored2.text).toBe('persistent_value_2');

      const restoredMode = duel2.getRegistryValue('duel_mode');
      expect(restoredMode.text).toBe('match');

      duel2.endDuel();
    } finally {
      wrapper.finalize();
    }
  });

  test('dumps and loads registry with dict format', async () => {
    const wrapper = await createOcgcoreWrapper();

    try {
      // First duel: set values and dump
      const duel1 = wrapper.createDuel(12345);
      duel1.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
      duel1.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });

      duel1.setRegistryValue('key_a', 'value_a');
      duel1.setRegistryValue('key_b', 'value_b');
      duel1.setRegistryValue('key_c', 'value_c');

      const dumpResult = duel1.dumpRegistry();
      expect(dumpResult.dict).toBeDefined();
      expect(dumpResult.dict['key_a']).toBe('value_a');
      expect(dumpResult.dict['key_b']).toBe('value_b');
      expect(dumpResult.dict['key_c']).toBe('value_c');

      duel1.endDuel();

      // Second duel: load from dict
      const duel2 = wrapper.createDuel(67890);
      duel2.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
      duel2.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });
      duel2.loadRegistry(dumpResult.dict);

      // Verify values are restored
      const restored1 = duel2.getRegistryValue('key_a');
      expect(restored1.text).toBe('value_a');

      const restored2 = duel2.getRegistryValue('key_b');
      expect(restored2.text).toBe('value_b');

      const restored3 = duel2.getRegistryValue('key_c');
      expect(restored3.text).toBe('value_c');

      duel2.endDuel();
    } finally {
      wrapper.finalize();
    }
  });

  test('clears registry', async () => {
    const wrapper = await createOcgcoreWrapper();

    try {
      const duel = wrapper.createDuel(12345);

      // Initialize duel
      duel.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
      duel.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });

      // Set some values
      duel.setRegistryValue('clear_test_1', 'value_1');
      duel.setRegistryValue('clear_test_2', 'value_2');

      // Verify they exist
      let keys = duel.getRegistryKeys();
      expect(keys.keys).toContain('clear_test_1');
      expect(keys.keys).toContain('clear_test_2');

      // Clear registry
      duel.clearRegistry();

      // Verify keys are gone
      keys = duel.getRegistryKeys();
      expect(keys.keys).not.toContain('clear_test_1');
      expect(keys.keys).not.toContain('clear_test_2');
      expect(keys.keys.length).toBe(0);

      duel.endDuel();
    } finally {
      wrapper.finalize();
    }
  });

  test('handles special characters in registry', async () => {
    const wrapper = await createOcgcoreWrapper();

    try {
      const duel = wrapper.createDuel(12345);

      // Initialize duel
      duel.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
      duel.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });

      // Set values with special characters
      duel.setRegistryValue('utf8_test', 'Hello 世界 🎮');
      duel.setRegistryValue('newline_test', 'line1\nline2\nline3');
      duel.setRegistryValue('space_test', 'hello world with spaces');
      duel.setRegistryValue('empty_test', '');

      // Get and verify
      const utf8Value = duel.getRegistryValue('utf8_test');
      expect(utf8Value.text).toBe('Hello 世界 🎮');
      expect(utf8Value.value).toBeInstanceOf(Uint8Array);

      const newlineValue = duel.getRegistryValue('newline_test');
      expect(newlineValue.text).toBe('line1\nline2\nline3');

      const spaceValue = duel.getRegistryValue('space_test');
      expect(spaceValue.text).toBe('hello world with spaces');

      const emptyValue = duel.getRegistryValue('empty_test');
      expect(emptyValue.text).toBe('');
      expect(emptyValue.value.length).toBe(0);

      duel.endDuel();
    } finally {
      wrapper.finalize();
    }
  });

  test('overwrites existing registry values', async () => {
    const wrapper = await createOcgcoreWrapper();

    try {
      const duel = wrapper.createDuel(12345);

      // Initialize duel
      duel.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
      duel.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });

      // Set initial value
      duel.setRegistryValue('overwrite_test', 'initial_value');
      let value = duel.getRegistryValue('overwrite_test');
      expect(value.text).toBe('initial_value');

      // Overwrite with new value
      duel.setRegistryValue('overwrite_test', 'new_value');
      value = duel.getRegistryValue('overwrite_test');
      expect(value.text).toBe('new_value');

      // Overwrite with empty value
      duel.setRegistryValue('overwrite_test', '');
      value = duel.getRegistryValue('overwrite_test');
      expect(value.text).toBe('');

      duel.endDuel();
    } finally {
      wrapper.finalize();
    }
  });

  test('registry usage like in playYrp', async () => {
    const wrapper = await createOcgcoreWrapper();

    try {
      const duel = wrapper.createDuel(12345);

      // Use registry like playYrp does - before setPlayerInfo
      duel.setRegistryValue('duel_mode', 'single');
      duel.setRegistryValue('start_lp', '8000');
      duel.setRegistryValue('start_hand', '5');
      duel.setRegistryValue('draw_count', '1');
      duel.setRegistryValue('player_name_0', 'Player1');
      duel.setRegistryValue('player_name_1', 'Player2');

      // Initialize duel after setting registry
      duel.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
      duel.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });

      // Get keys to verify values were set
      const keys = duel.getRegistryKeys();
      expect(keys.keys).toContain('duel_mode');
      expect(keys.keys).toContain('start_lp');
      expect(keys.keys).toContain('player_name_0');
      expect(keys.keys.length).toBeGreaterThanOrEqual(6);

      // Verify actual values
      const duelMode = duel.getRegistryValue('duel_mode');
      expect(duelMode.text).toBe('single');

      const playerName = duel.getRegistryValue('player_name_0');
      expect(playerName.text).toBe('Player1');

      duel.endDuel();
    } finally {
      wrapper.finalize();
    }
  });
});
