import { Advancor } from './types';

export const SlientAdvancor = (): Advancor => {
  return (msg) => {
    return msg.defaultResponse();
  };
};
