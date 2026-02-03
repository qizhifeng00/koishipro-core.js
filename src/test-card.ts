import { OcgcoreWrapper } from './ocgcore-wrapper';
import { OcgcoreCommonConstants, OcgcoreScriptConstants } from './vendor';
import { OcgcoreMessageType } from './types/ocgcore-enums';

const { LOCATION_DECK, POS_FACEUP_ATTACK } = OcgcoreScriptConstants;

export interface TestCardMessage {
  type: OcgcoreMessageType;
  message: string;
}

export function testCard(
  ocgcoreWrapper: OcgcoreWrapper,
  ...ids: number[]
): TestCardMessage[] {
  const logs: TestCardMessage[] = [];
  const duel = ocgcoreWrapper.createDuelV2(
    Array.from(
      { length: 8 },
      () => Math.floor(Math.random() * 0xffffffff) >>> 0,
    ),
  );

  ocgcoreWrapper.setMessageHandler((_duel, message, type) => {
    if (duel.duelPtr !== _duel.duelPtr) return;
    logs.push({ type, message });
  });

  duel.preloadScript('./script/special.lua');
  duel.preloadScript('./script/init.lua');
  duel.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
  duel.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });

  for (const code of ids) {
    duel.newCard({
      code,
      owner: 0,
      player: 0,
      location: LOCATION_DECK,
      sequence: 0,
      position: POS_FACEUP_ATTACK,
    });
  }

  duel.startDuel(0);

  while (true) {
    const { status, raw } = duel.process();
    if (raw.length > 0 && raw[0] === OcgcoreCommonConstants.MSG_RETRY) {
      break;
    }
    if (status === 0) {
      continue;
    }
    break;
  }

  duel.endDuel();
  return logs;
}
