import { makeArray, MayBeArray } from 'nfkit';

export const StaticAdvancor = <T>(items: MayBeArray<T>) => {
  const _items = makeArray(items).slice();
  return () => _items.shift();
};
