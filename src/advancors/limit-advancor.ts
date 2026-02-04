import { YGOProMsgResponseBase } from 'ygopro-msg-encode';
import { Advancor } from './types';

export const LimitAdvancor = <T extends YGOProMsgResponseBase>(
  a: Advancor<T>,
  limit = 1,
): Advancor<T> => {
  let called = 0;
  return (msg) => {
    if (called >= limit) {
      return undefined;
    }
    const res = a(msg);
    if (res !== undefined) {
      called++;
    }
    return res;
  };
};

export const OnceAdvancor = <T extends YGOProMsgResponseBase>(
  a: Advancor<T>,
): Advancor<T> => LimitAdvancor(a, 1);
