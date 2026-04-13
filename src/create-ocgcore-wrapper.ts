import type { OcgcoreModule } from './vendor/libocgcore.shared';
import { OcgcoreWrapper } from './ocgcore-wrapper';
import { loadOcgcoreFactory } from './load-ocgcore-factory';
import { decodeOcgcoreDuelSnapshot } from './ocgcore-snapshot';
import type { OcgcoreDuel } from './ocgcore-duel';

export interface CreateOcgcoreWrapperOptions {
  moduleOverrides?: Partial<OcgcoreModule>;
  wasmBinary?: Uint8Array;
  locateFile?: (path: string, prefix?: string) => string;
}

export async function createOcgcoreWrapper(
  options: CreateOcgcoreWrapperOptions = {},
): Promise<OcgcoreWrapper> {
  const moduleInstance = await createOcgcoreModule(options);
  return new OcgcoreWrapper(moduleInstance);
}

async function createOcgcoreModule(
  options: CreateOcgcoreWrapperOptions = {},
): Promise<OcgcoreModule> {
  const factory = await loadOcgcoreFactory();
  const overrides: Partial<OcgcoreModule> = {
    ...options.moduleOverrides,
  };
  if (overrides.quit == null) {
    overrides.quit = () => {
      // Prevent emscripten from exiting the host process.
    };
  }
  if (options.wasmBinary) {
    overrides.wasmBinary =
      options.wasmBinary as unknown as OcgcoreModule['wasmBinary'];
  }
  if (options.locateFile) {
    overrides.locateFile =
      options.locateFile as unknown as OcgcoreModule['locateFile'];
  }
  return factory(overrides);
}

function ensureMemoryCapacity(
  moduleInstance: OcgcoreModule,
  byteLength: number,
): void {
  while ((moduleInstance.HEAPU8 as Uint8Array).byteLength < byteLength) {
    const before = (moduleInstance.HEAPU8 as Uint8Array).byteLength;
    const ptr = moduleInstance._malloc(byteLength);
    if (ptr) {
      moduleInstance._free(ptr);
    }
    const after = (moduleInstance.HEAPU8 as Uint8Array).byteLength;
    if (after <= before) {
      throw new Error(
        'Unable to grow ocgcore wasm memory for snapshot restore',
      );
    }
  }
}

export async function createOcgcoreDuelFromSnapshot(
  snapshot: Uint8Array,
  options: CreateOcgcoreWrapperOptions = {},
): Promise<OcgcoreDuel> {
  const decoded = decodeOcgcoreDuelSnapshot(snapshot);
  const moduleInstance = await createOcgcoreModule(options);

  ensureMemoryCapacity(moduleInstance, decoded.metadata.memoryByteLength);
  (moduleInstance.HEAPU8 as Uint8Array).set(decoded.memory, 0);

  const wrapper = new OcgcoreWrapper(moduleInstance);
  wrapper.restoreSnapshotState(decoded.metadata.wrapper);
  return wrapper.attachDuel(
    decoded.metadata.duel.duelPtr,
    decoded.metadata.duel,
  );
}
