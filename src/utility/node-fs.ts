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

import { loadNodeModule, loadNodeModuleOrThrow } from './load-node-module';

export function getNodeFs(noThrow = false): NodeFs | null {
  if (noThrow) {
    return loadNodeModule<NodeFs>('fs');
  }
  return loadNodeModuleOrThrow<NodeFs>(
    'fs',
    'Node.js fs module is not available.',
  );
}
