import { YGOProMsgResponseBase } from 'ygopro-msg-encode';
import { Advancor } from './types';

export const PlayerViewAdvancor =
  <T extends YGOProMsgResponseBase>(
    player: number,
    a: Advancor<T>,
  ): Advancor<T> =>
  (msg) => {
    if (msg.responsePlayer() === player) {
      return a(msg);
    }
    return undefined;
  };
