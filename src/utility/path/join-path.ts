import { getNodePath } from '../node-path';
import { getNodeModuleOrThrow } from '../get-node-module-or-throw';

export function joinPath(...parts: string[]): string {
  const pathMod = getNodeModuleOrThrow(getNodePath(), 'joinPath');
  return pathMod.join(...parts);
}
