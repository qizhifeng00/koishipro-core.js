export type NodePath = {
  join: (...parts: string[]) => string;
};

import { loadNodeModule } from './load-node-module';

export function getNodePath(noThrow = false): NodePath | null {
  const mod = loadNodeModule<NodePath>('node:path', 'path');
  if (mod) return mod;
  if (noThrow) return null;
  throw new Error('Node.js path module is not available.');
}
