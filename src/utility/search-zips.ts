import JSZip, { JSZipObject } from 'jszip';

import { getNodeModuleOrThrow } from './get-node-module-or-throw';
import { getNodeFs } from './node-fs';
import { joinPath } from './path';

type NodeFs = NonNullable<ReturnType<typeof getNodeFs>>;
export type YGOProResource = {
  path: string;
  zipPath?: string;
  read: () => Promise<Uint8Array>;
};

async function safeReadDir(fs: NodeFs, dirPath: string): Promise<string[]> {
  try {
    return await fs.promises.readdir(dirPath);
  } catch {
    return [];
  }
}

function isYGOProYpk(entry: string): boolean {
  return entry.toLowerCase().endsWith('.ypk');
}

function isArchivePath(entry: string): boolean {
  const lower = entry.toLowerCase();
  return lower.endsWith('.ypk') || lower.endsWith('.zip');
}

async function* searchYGOProEntryPath(
  fs: NodeFs,
  match: (entry: string) => boolean,
  ...baseDirs: string[]
): AsyncGenerator<string> {
  for (const baseDir of baseDirs) {
    const rootEntries = await safeReadDir(fs, baseDir);
    for (const entry of rootEntries) {
      if (!match(entry)) {
        continue;
      }
      const fullPath = joinPath(baseDir, entry);
      try {
        const stats = await fs.promises.stat(fullPath);
        if (stats.isFile()) {
          yield fullPath;
        }
      } catch {
        continue;
      }
    }

    const expansionsDir = joinPath(baseDir, 'expansions');
    const expansionEntries = await safeReadDir(fs, expansionsDir);
    for (const entry of expansionEntries) {
      if (!match(entry)) {
        continue;
      }
      const fullPath = joinPath(expansionsDir, entry);
      try {
        const stats = await fs.promises.stat(fullPath);
        if (stats.isFile()) {
          yield fullPath;
        }
      } catch {
        continue;
      }
    }
  }
}

async function* searchYGOProYpkPath(
  fs: NodeFs,
  ...baseDirs: string[]
): AsyncGenerator<string> {
  yield* searchYGOProEntryPath(fs, isYGOProYpk, ...baseDirs);
}

export async function* searchYGOProYpk(
  ...baseDirs: string[]
): AsyncGenerator<Uint8Array> {
  const fs = getNodeModuleOrThrow(getNodeFs(), 'searchYGOProYpk');
  for await (const ypkPath of searchYGOProYpkPath(fs, ...baseDirs)) {
    try {
      yield await fs.promises.readFile(ypkPath);
    } catch {
      continue;
    }
  }
}

export async function* searchYGOProYpkFile(
  ...baseDirs: string[]
): AsyncGenerator<JSZipObject> {
  for await (const ypkBytes of searchYGOProYpk(...baseDirs)) {
    try {
      const zip = await JSZip.loadAsync(ypkBytes);
      for (const file of Object.values(zip.files)) {
        if (file.dir) {
          continue;
        }
        yield file;
      }
    } catch {
      continue;
    }
  }
}

export async function* searchYGOProResource(
  ...baseDirs: string[]
): AsyncGenerator<YGOProResource> {
  const fs = getNodeModuleOrThrow(getNodeFs(), 'searchYGOProResource');

  for await (const filePath of searchYGOProEntryPath(
    fs,
    (entry) => !isArchivePath(entry),
    ...baseDirs,
  )) {
    yield {
      path: filePath,
      read: () => fs.promises.readFile(filePath),
    };
  }

  for await (const zipPath of searchYGOProEntryPath(
    fs,
    isArchivePath,
    ...baseDirs,
  )) {
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(await fs.promises.readFile(zipPath));
    } catch {
      continue;
    }

    for (const file of Object.values(zip.files)) {
      if (file.dir) {
        continue;
      }
      yield {
        path: file.name,
        zipPath,
        read: () => file.async('uint8array'),
      };
    }
  }
}
