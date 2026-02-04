import { YGOProMsgSelectChain } from 'ygopro-msg-encode';
import { MapAdvancor, MapAdvancorHandler } from './map-advancor';

export const NoEffectAdvancor = () =>
  MapAdvancor(
    MapAdvancorHandler(YGOProMsgSelectChain, (msg) => {
      if (msg.chains.length) {
        return;
      }
      return msg.prepareResponse(undefined);
    }),
  );
