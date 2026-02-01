import type { OcgcoreFactory } from './vendor/libocgcore.shared';
import createOcgcore from './vendor/wasm_esm/libocgcore.mjs';
import { normalizeOcgcoreFactory } from './ocgcore-wrapper-utils';

export async function loadOcgcoreFactory(): Promise<OcgcoreFactory> {
  return normalizeOcgcoreFactory(createOcgcore as unknown);
}
