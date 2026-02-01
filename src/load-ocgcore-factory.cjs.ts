import type { OcgcoreFactory } from './vendor/libocgcore.shared';
import { normalizeOcgcoreFactory } from './ocgcore-wrapper-utils';
import { getNodeFs } from './utility/node-fs';
import { getNodePath } from './utility/node-path';

export async function loadOcgcoreFactory(): Promise<OcgcoreFactory> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('./vendor/wasm_cjs/libocgcore.cjs') as unknown;
  const baseFactory = normalizeOcgcoreFactory(mod);

  const fs = getNodeFs(true);
  if (!fs) {
    return baseFactory;
  }

  const pathMod = getNodePath(true);
  if (!pathMod) {
    return baseFactory;
  }
  let defaultWasmBinary: Uint8Array | null = null;
  const wasmPath = pathMod.join(
    __dirname,
    'vendor',
    'wasm_cjs',
    'libocgcore.wasm',
  );
  if (fs.existsSync(wasmPath)) {
    defaultWasmBinary = fs.readFileSync(wasmPath);
  }

  if (!defaultWasmBinary) {
    return baseFactory;
  }

  return async (overrides) => {
    if (!overrides?.wasmBinary && !overrides?.locateFile) {
      return baseFactory({
        ...overrides,
        wasmBinary: defaultWasmBinary.buffer as ArrayBuffer,
      });
    }
    return baseFactory(overrides);
  };
}
