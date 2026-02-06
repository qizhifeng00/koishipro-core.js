import { Advancor } from "./types";

export const CombinedAdvancor = (...advancors: Advancor[]): Advancor => {
  return (msg) => {
    for (const advancor of advancors) {
      const res = advancor(msg);
      if (res != null) {
        return res;
      }
    }
    return undefined;
  };
};
