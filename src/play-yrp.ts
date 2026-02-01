import { YGOProYrp } from 'ygopro-yrp-encode';

import { OcgcoreDuel } from './ocgcore-duel';
import { OcgcoreWrapper } from './ocgcore-wrapper';
import { OcgcoreCommonConstants } from './vendor/ocgcore-constants';
import { OcgcoreScriptConstants } from './vendor/script-constants';
import { OcgcoreProcessResult } from './types';

const { LOCATION_DECK, LOCATION_EXTRA, POS_FACEDOWN_DEFENSE } =
  OcgcoreScriptConstants;

function normalizeYrp(input: YGOProYrp | Uint8Array): YGOProYrp {
  if (input instanceof YGOProYrp) {
    return input;
  }
  return new YGOProYrp().fromYrp(input);
}

function createReplayDuel(
  wrapper: OcgcoreWrapper,
  yrp: YGOProYrp,
): OcgcoreDuel {
  const header = yrp.header;
  const seedSequence = header?.seedSequence ?? [];
  if (seedSequence.length > 0) {
    return wrapper.createDuelV2(seedSequence);
  }
  return wrapper.createDuel(header?.seed ?? 0);
}

function loadDeck(
  duel: OcgcoreDuel,
  deck: { main?: number[]; extra?: number[] } | null,
  owner: number,
  playerId: number,
): void {
  if (!deck) return;
  for (const code of deck.main ?? []) {
    duel.newCard({
      code,
      owner,
      playerId,
      location: LOCATION_DECK,
      sequence: 0,
      position: POS_FACEDOWN_DEFENSE,
    });
  }
  for (const code of deck.extra ?? []) {
    duel.newCard({
      code,
      owner,
      playerId,
      location: LOCATION_EXTRA,
      sequence: 0,
      position: POS_FACEDOWN_DEFENSE,
    });
  }
}

function loadTagDeck(
  duel: OcgcoreDuel,
  deck: { main?: number[]; extra?: number[] } | null,
  owner: number,
): void {
  if (!deck) return;
  for (const code of deck.main ?? []) {
    duel.newTagCard({
      code,
      owner,
      location: LOCATION_DECK,
    });
  }
  for (const code of deck.extra ?? []) {
    duel.newTagCard({
      code,
      owner,
      location: LOCATION_EXTRA,
    });
  }
}

function setRegistryValue(duel: OcgcoreDuel, key: string, value: string): void {
  duel.setRegistryValue(key, value);
}

export function* playYrpStep(
  ocgcoreWrapper: OcgcoreWrapper,
  yrpInput: YGOProYrp | Uint8Array,
) {
  const yrp = normalizeYrp(yrpInput);
  const responses = yrp.responses.slice();
  const duel = createReplayDuel(ocgcoreWrapper, yrp);
  let ended = false;
  const endDuel = () => {
    if (ended) return;
    duel.endDuel();
    ended = true;
  };

  try {
    setRegistryValue(duel, 'duel_mode', yrp.isTag ? 'tag' : 'single');
    setRegistryValue(duel, 'start_lp', String(yrp.startLp));
    setRegistryValue(duel, 'start_hand', String(yrp.startHand));
    setRegistryValue(duel, 'draw_count', String(yrp.drawCount));

    const playerNames = yrp.isTag
      ? [
          yrp.hostName,
          yrp.tagHostName ?? '',
          yrp.tagClientName ?? '',
          yrp.clientName,
        ]
      : [yrp.hostName, yrp.clientName];
    for (let i = 0; i < playerNames.length; i++) {
      setRegistryValue(duel, `player_name_${i}`, playerNames[i] ?? '');
    }
    setRegistryValue(duel, 'player_type_0', '0');
    setRegistryValue(duel, 'player_type_1', '1');

    duel.setPlayerInfo({
      playerId: 0,
      lp: yrp.startLp,
      startCount: yrp.startHand,
      drawCount: yrp.drawCount,
    });
    duel.setPlayerInfo({
      playerId: 1,
      lp: yrp.startLp,
      startCount: yrp.startHand,
      drawCount: yrp.drawCount,
    });

    duel.preloadScript('./script/patches/entry.lua');
    duel.preloadScript('./script/special.lua');
    duel.preloadScript('./script/init.lua');

    if (yrp.isSingleMode && yrp.singleScript) {
      duel.preloadScript(`./single/${yrp.singleScript}`);
    } else if (yrp.isTag) {
      loadDeck(duel, yrp.hostDeck, 0, 0);
      loadTagDeck(duel, yrp.tagHostDeck, 0);
      loadDeck(duel, yrp.clientDeck, 1, 1);
      loadTagDeck(duel, yrp.tagClientDeck, 1);
    } else {
      loadDeck(duel, yrp.hostDeck, 0, 0);
      loadDeck(duel, yrp.clientDeck, 1, 1);
    }

    duel.startDuel(yrp.opt >>> 0);

    while (true) {
      const result = duel.process();
      yield {
        duel,
        result,
      };

      if (
        result.raw.length > 0 &&
        result.raw[0] === OcgcoreCommonConstants.MSG_RETRY
      ) {
        throw new Error('Got MSG_RETRY');
      }

      if (result.status === 0) {
        continue;
      }
      if (result.status === 1) {
        if (result.raw.length === 0) {
          continue;
        }
        const response = responses.shift();
        if (!response) {
          break;
        }
        duel.setResponse(response);
        continue;
      }
      break;
    }
  } finally {
    endDuel();
  }
}

export const playYrp = (
  ocgcoreWrapper: OcgcoreWrapper,
  yrpInput: YGOProYrp | Uint8Array,
) => {
  const results: Uint8Array[] = [];
  for (const result of playYrpStep(ocgcoreWrapper, yrpInput)) {
    results.push(result.result.raw);
  }
  return results;
};
