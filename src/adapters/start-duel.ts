import { OcgcoreStartDuelOptions } from '../types/ocgcore-params';

export function normalizeStartDuelOptions(
  options: number | OcgcoreStartDuelOptions,
): number {
  if (typeof options === 'number') {
    return options;
  }
  const duelRule = options.rule ?? 0;
  let duelOptions = options.options ?? 0;
  if (options.flags?.length) {
    for (const flag of options.flags) {
      duelOptions = (duelOptions | flag) >>> 0;
    }
  }
  return ((((duelRule & 0xffff) << 16) | (duelOptions & 0xffff)) >>> 0);
}
