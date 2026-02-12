import { getNodeFs } from './node-fs';
import { joinPath } from './path';

type NodeFs = NonNullable<ReturnType<typeof getNodeFs>>;

async function safeReadDir(fs: NodeFs, dirPath: string): Promise<string[]> {
  try {
    return await fs.promises.readdir(dirPath);
  } catch {
    return [];
  }
}

export async function searchZips(
  fs: NodeFs,
  baseDir: string,
): Promise<string[]> {
  const results: string[] = [];
  const rootEntries = await safeReadDir(fs, baseDir);
  for (const entry of rootEntries) {
    const lower = entry.toLowerCase();
    if (!lower.endsWith('.zip') && !lower.endsWith('.ypk')) {
      continue;
    }
    const fullPath = joinPath(baseDir, entry);
    try {
      const stats = await fs.promises.stat(fullPath);
      if (stats.isFile()) {
        results.push(fullPath);
      }
    } catch {
      continue;
    }
  }

  const expansionsDir = joinPath(baseDir, 'expansions');
  const expansionEntries = await safeReadDir(fs, expansionsDir);
  for (const entry of expansionEntries) {
    const lower = entry.toLowerCase();
    if (!lower.endsWith('.zip') && !lower.endsWith('.ypk')) {
      continue;
    }
    const fullPath = joinPath(expansionsDir, entry);
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
