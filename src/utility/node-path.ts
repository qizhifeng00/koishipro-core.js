export type NodePath = {
  join: (...parts: string[]) => string;
  resolve: (...parts: string[]) => string;
};

import { loadNodeModule, loadNodeModuleOrThrow } from './load-node-module';

export function getNodePath(noThrow = false): NodePath | null {
  if (noThrow) {
    return loadNodeModule<NodePath>('path');
  }
  return loadNodeModuleOrThrow<NodePath>(
    'path',
    'Node.js path module is not available.',
  );
}
