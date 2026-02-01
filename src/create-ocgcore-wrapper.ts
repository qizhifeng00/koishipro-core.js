import type { OcgcoreModule } from './vendor/libocgcore.shared';
import { OcgcoreWrapper } from './ocgcore-wrapper';
import { loadOcgcoreFactory } from './load-ocgcore-factory';

export interface CreateOcgcoreWrapperOptions {
  moduleOverrides?: Partial<OcgcoreModule>;
  wasmBinary?: Uint8Array;
  locateFile?: (path: string, prefix?: string) => string;
}

export async function createOcgcoreWrapper(
  options: CreateOcgcoreWrapperOptions = {},
): Promise<OcgcoreWrapper> {
  const factory = await loadOcgcoreFactory();
  const overrides: Partial<OcgcoreModule> = {
    ...options.moduleOverrides,
  };
  if (options.wasmBinary) {
    overrides.wasmBinary = options.wasmBinary as unknown as OcgcoreModule['wasmBinary'];
  }
  if (options.locateFile) {
    overrides.locateFile = options.locateFile as unknown as OcgcoreModule['locateFile'];
  }
  const moduleInstance = await factory(overrides);
  return new OcgcoreWrapper(moduleInstance);
}
