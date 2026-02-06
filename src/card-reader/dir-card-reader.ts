import JSZip from 'jszip';

import type { CardReader } from '../types/callback';
import { getNodeFs } from '../utility/node-fs';
import { getNodePath } from '../utility/node-path';
import { searchZips } from '../utility/search-zips';
import { SqljsCardReader } from './sqljs-card-reader';
import type { Database, SqlJsStatic } from 'sql.js';

type NodeFs = NonNullable<ReturnType<typeof getNodeFs>>;
type NodePath = NonNullable<ReturnType<typeof getNodePath>>;

function joinPath(
  pathMod: NodePath | null,
  baseDir: string,
  rel: string,
): string {
  if (pathMod) {
    return pathMod.join(baseDir, rel);
  }
  const trimmedBase = baseDir.replace(/[/\\]+$/, '');
  const trimmedRel = rel.replace(/^[/\\]+/, '');
  return `${trimmedBase}/${trimmedRel}`;
}

function getNodeModuleOrThrow<T>(value: T | null, label: string): T {
  if (!value) {
    throw new Error(`${label} is not supported in this runtime.`);
  }
  return value;
}

async function safeReadDir(fs: NodeFs, dirPath: string): Promise<string[]> {
  try {
    return await fs.promises.readdir(dirPath);
  } catch {
    return [];
  }
}

async function collectFsDbPaths(
  fs: NodeFs,
  pathMod: NodePath | null,
  baseDir: string,
): Promise<string[]> {
  const collectCdbFiles = async (dirPath: string): Promise<string[]> => {
    const paths: string[] = [];
    const entries = await safeReadDir(fs, dirPath);
    for (const entry of entries) {
      if (!entry.toLowerCase().endsWith('.cdb')) {
        continue;
      }
      const fullPath = joinPath(pathMod, dirPath, entry);
      try {
        const stats = await fs.promises.stat(fullPath);
        if (stats.isFile()) {
          paths.push(fullPath);
        }
      } catch {
        continue;
      }
    }
    return paths;
  };

  const results: string[] = [];

  const expansionsDir = joinPath(pathMod, baseDir, 'expansions');
  results.push(...(await collectCdbFiles(expansionsDir)));

  results.push(...(await collectCdbFiles(baseDir)));

  return results;
}

function isRootCdbEntry(entryName: string): boolean {
  const normalized = entryName.replace(/\\/g, '/').replace(/^\.?\//, '');
  return !normalized.includes('/') && normalized.toLowerCase().endsWith('.cdb');
}

export async function DirCardReader(
  sqljs: SqlJsStatic,
  ...baseDirs: string[]
): Promise<CardReader> {
  const fs = getNodeModuleOrThrow(getNodeFs(), 'DirCardReader');
  const pathMod = getNodeModuleOrThrow(getNodePath(), 'DirCardReader');

  const dbs: Database[] = [];
  for (const baseDir of baseDirs) {
    const dbPaths = await collectFsDbPaths(fs, pathMod, baseDir);
    for (const dbPath of dbPaths) {
      try {
        const bytes = await fs.promises.readFile(dbPath);
        dbs.push(new sqljs.Database(bytes));
      } catch {
        continue;
      }
    }
  }

  for (const baseDir of baseDirs) {
    const zipPaths = await searchZips(fs, pathMod, baseDir);
    for (const zipPath of zipPaths) {
      try {
        const bytes = await fs.promises.readFile(zipPath);
        const zip = await JSZip.loadAsync(bytes);
        const entries = Object.values(zip.files);
        for (const entry of entries) {
          if (entry.dir || !isRootCdbEntry(entry.name)) {
            continue;
          }
          try {
            const content = await entry.async('uint8array');
            dbs.push(new sqljs.Database(content));
          } catch {
            continue;
          }
        }
      } catch {
        continue;
      }
    }
  }

  const reader = SqljsCardReader(...dbs);
  return {
    apply: reader,
    finalize: () => {
      for (const db of dbs) {
        try {
          db.close();
        } catch {
          // ignore close errors
        }
      }
    },
  };
}
