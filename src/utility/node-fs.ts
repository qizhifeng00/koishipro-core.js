export type NodeFs = {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string) => Uint8Array;
};

import { loadNodeModule } from './load-node-module';

export function getNodeFs(noThrow = false): NodeFs | null {
  const mod = loadNodeModule<NodeFs>('node:fs', 'fs');
  if (mod) return mod;
  if (noThrow) return null;
  throw new Error('Node.js fs module is not available.');
}
