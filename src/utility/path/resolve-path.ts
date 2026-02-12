import { getNodePath } from '../node-path';
import { getNodeModuleOrThrow } from '../get-node-module-or-throw';

export function resolvePath(...parts: string[]): string {
  const pathMod = getNodeModuleOrThrow(getNodePath(), 'resolvePath');
  return pathMod.resolve(...parts);
}
