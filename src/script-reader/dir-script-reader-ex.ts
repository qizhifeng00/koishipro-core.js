import type { ScriptReader } from '../types/callback';
import { DirScriptReader, ZipScriptReader } from './script-readers';
import { getNodeFs } from '../utility/node-fs';
import { getNodePath } from '../utility/node-path';
import { searchZips } from '../utility/search-zips';

function getNodeModuleOrThrow<T>(value: T | null, label: string): T {
  if (!value) {
    throw new Error(`${label} is not supported in this runtime.`);
  }
  return value;
}

export async function DirScriptReaderEx(
  ...baseDirs: string[]
): Promise<ScriptReader> {
  const fs = getNodeModuleOrThrow(getNodeFs(), 'DirScriptReaderEx');
  const pathMod = getNodeModuleOrThrow(getNodePath(), 'DirScriptReaderEx');
  const fsReader = DirScriptReader(...baseDirs);

  const zipInputs: Uint8Array[] = [];
  for (const baseDir of baseDirs) {
    const zipPaths = await searchZips(fs, pathMod, baseDir);
    for (const zipPath of zipPaths) {
      try {
        zipInputs.push(await fs.promises.readFile(zipPath));
      } catch {
        continue;
      }
    }
  }

  if (zipInputs.length === 0) {
    return fsReader;
  }

  const zipReader = await ZipScriptReader(...zipInputs);
  return (path) => fsReader(path) ?? zipReader(path);
}
