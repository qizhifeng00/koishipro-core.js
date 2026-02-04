import { YGOProMsgResponseBase } from 'ygopro-msg-encode';
import { Advancor } from './types';

export interface MapAdvancorHandleObject<T extends YGOProMsgResponseBase> {
  msgClass: new (...args: any[]) => T;
  cb: Advancor<T>;
}

export const MapAdvancorHandler = <T extends YGOProMsgResponseBase>(
  msgClass: new (...args: any[]) => T,
  cb: Advancor<T>,
): MapAdvancorHandleObject<T> => ({
  msgClass,
  cb,
});

export const MapAdvancor = (
  ...handlers: MapAdvancorHandleObject<YGOProMsgResponseBase>[]
): Advancor => {
  const handlerMap = new Map<
    new (...args: any[]) => YGOProMsgResponseBase,
    (msg: YGOProMsgResponseBase) => Uint8Array | undefined
  >();
  for (const handleObj of handlers) {
    handlerMap.set(handleObj.msgClass, handleObj.cb);
  }

  return (msg) => {
    const cb = handlerMap.get(
      msg.constructor as new (...args: any[]) => YGOProMsgResponseBase,
    );
    if (cb != null) {
      const res = cb(msg);
      if (res != null) {
        return res;
      }
    }
    return undefined;
  };
};
