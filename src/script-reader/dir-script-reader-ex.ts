import type { ScriptReader } from '../types/callback';
import { DirScriptReader, ZipScriptReader } from './script-readers';
import { getNodeModuleOrThrow } from '../utility/get-node-module-or-throw';
import { getNodeFs } from '../utility/node-fs';
import { searchZips } from '../utility/search-zips';
import type { ScriptReaderFn, WithFinalizer } from '../types/callback';

export async function DirScriptReaderEx(
  ...baseDirs: string[]
): Promise<ScriptReader> {
  const fs = getNodeModuleOrThrow(getNodeFs(), 'DirScriptReaderEx');
  const fsReader = DirScriptReader(...baseDirs);

  const zipInputs: Uint8Array[] = [];
  for (const baseDir of baseDirs) {
    const zipPaths = await searchZips(fs, baseDir);
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
  const applyReader = (reader: WithFinalizer<ScriptReaderFn>, path: string) =>
    typeof reader === 'function' ? reader(path) : reader.apply(path);
  const finalizeReader = (reader: WithFinalizer<ScriptReaderFn>) => {
    if (typeof reader === 'function') {
      return;
    }
    try {
      reader.finalize?.();
    } catch {
      // ignore finalizer errors
    }
  };

  return {
    apply: (path) => applyReader(fsReader, path) ?? applyReader(zipReader, path),
    finalize: () => {
      finalizeReader(fsReader);
      finalizeReader(zipReader);
    },
  };
}
