type NodeStats = {
  isFile: () => boolean;
};

type NodeFsPromises = {
  readFile: (path: string) => Promise<Uint8Array>;
  readdir: (path: string) => Promise<string[]>;
  stat: (path: string) => Promise<NodeStats>;
  access: (path: string) => Promise<void>;
};

export type NodeFs = {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string) => Uint8Array;
  promises: NodeFsPromises;
};

import { loadNodeModule } from './load-node-module';

export function getNodeFs(noThrow = false): NodeFs | null {
  const mod = loadNodeModule<NodeFs>('node:fs', 'fs');
  if (mod) return mod;
  if (noThrow) return null;
  throw new Error('Node.js fs module is not available.');
}
