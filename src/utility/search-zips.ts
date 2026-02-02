import { getNodeFs } from './node-fs';
import { getNodePath } from './node-path';

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

async function safeReadDir(fs: NodeFs, dirPath: string): Promise<string[]> {
  try {
    return await fs.promises.readdir(dirPath);
  } catch {
    return [];
  }
}

export async function searchZips(
  fs: NodeFs,
  pathMod: NodePath | null,
  baseDir: string,
): Promise<string[]> {
  const results: string[] = [];
  const rootEntries = await safeReadDir(fs, baseDir);
  for (const entry of rootEntries) {
    const lower = entry.toLowerCase();
    if (!lower.endsWith('.zip') && !lower.endsWith('.ypk')) {
      continue;
    }
    const fullPath = joinPath(pathMod, baseDir, entry);
    try {
      const stats = await fs.promises.stat(fullPath);
      if (stats.isFile()) {
        results.push(fullPath);
      }
    } catch {
      continue;
    }
  }

  const expansionsDir = joinPath(pathMod, baseDir, 'expansions');
  const expansionEntries = await safeReadDir(fs, expansionsDir);
  for (const entry of expansionEntries) {
    const lower = entry.toLowerCase();
    if (!lower.endsWith('.zip') && !lower.endsWith('.ypk')) {
      continue;
    }
    const fullPath = joinPath(pathMod, expansionsDir, entry);
    try {
      const stats = await fs.promises.stat(fullPath);
      if (stats.isFile()) {
        results.push(fullPath);
      }
    } catch {
      continue;
    }
  }

  return results;
}
