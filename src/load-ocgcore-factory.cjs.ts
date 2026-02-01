import type { OcgcoreFactory } from './vendor/libocgcore.shared';
import { normalizeOcgcoreFactory } from './ocgcore-wrapper-utils';

export async function loadOcgcoreFactory(): Promise<OcgcoreFactory> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('./vendor/wasm_cjs/libocgcore.cjs') as unknown;
  return normalizeOcgcoreFactory(mod);
}
