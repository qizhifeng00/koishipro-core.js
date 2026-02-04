import {
  SelectablePlace,
  YGOProMsgSelectPlace,
  YGOProMsgSelectPosition,
} from 'ygopro-msg-encode';
import { MapAdvancor, MapAdvancorHandler } from './map-advancor';

export type SelectablePlaceAndPosition = Partial<
  SelectablePlace & {
    position: number;
  }
>;

export const SummonPlaceAdvancor = (
  placeAndPosition: SelectablePlaceAndPosition = {},
) =>
  MapAdvancor(
    MapAdvancorHandler(YGOProMsgSelectPlace, (msg) => {
      const places = msg
        .getSelectablePlaces()
        .filter(
          (p) =>
            (placeAndPosition.player == null ||
              p.player === placeAndPosition.player) &&
            (placeAndPosition.location == null ||
              p.location === placeAndPosition.location) &&
            (placeAndPosition.sequence == null ||
              p.sequence === placeAndPosition.sequence),
        )
        .slice(0, msg.count);
      return msg.prepareResponse(places);
    }),
    MapAdvancorHandler(YGOProMsgSelectPosition, (msg) => {
      if (placeAndPosition.position) {
        return msg.prepareResponse(placeAndPosition.position);
      }
      // use lowest bit of location as position if not specified
      const possiblePositions = msg.positions;
      for (let i = 0; i < 8; i++) {
        const value = 1 << i;
        if ((possiblePositions & value) !== 0) {
          return msg.prepareResponse(value);
        }
      }
      return undefined;
    }),
  );
