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
  yield* searchYGOProEntryPathInScope(fs, 'expansions', match, ...baseDirs);
  yield* searchYGOProEntryPathInScope(fs, '', match, ...baseDirs);
}

type YGOProEntryScope = '' | 'expansions' | 'specials';

async function* searchYGOProEntryPathInScope(
  fs: NodeFs,
  scope: YGOProEntryScope,
  match: (entry: string) => boolean,
  ...baseDirs: string[]
): AsyncGenerator<string> {
  for (const baseDir of baseDirs) {
    const targetDir = scope === '' ? baseDir : joinPath(baseDir, scope);
    const entries = await safeReadDir(fs, targetDir);
    for (const entry of entries) {
      if (!match(entry)) {
        continue;
      }
      const fullPath = joinPath(targetDir, entry);
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

  yield* searchYGOProResourceInScope(fs, 'specials', false, ...baseDirs);
  yield* searchYGOProResourceInScope(fs, 'expansions', false, ...baseDirs);
  yield* searchYGOProResourceInScope(fs, 'expansions', true, ...baseDirs);
  yield* searchYGOProResourceInScope(fs, '', false, ...baseDirs);
  yield* searchYGOProResourceInScope(fs, '', true, ...baseDirs);
}

async function* searchYGOProResourceInScope(
  fs: NodeFs,
  scope: YGOProEntryScope,
  archivesOnly: boolean,
  ...baseDirs: string[]
): AsyncGenerator<YGOProResource> {
  const match = archivesOnly
    ? isArchivePath
    : (entry: string) => !isArchivePath(entry);
  for await (const entryPath of searchYGOProEntryPathInScope(
    fs,
    scope,
    match,
    ...baseDirs,
  )) {
    if (!archivesOnly) {
      yield {
        path: entryPath,
        read: () => fs.promises.readFile(entryPath),
      };
      continue;
    }

    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(await fs.promises.readFile(entryPath));
    } catch {
      continue;
    }

    for (const file of Object.values(zip.files)) {
      if (file.dir) {
        continue;
      }
      yield {
        path: file.name,
        zipPath: entryPath,
        read: () => file.async('uint8array'),
      };
    }
  }
}
