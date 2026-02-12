import type { ScriptReader } from '../types/callback';
import { DirScriptReader, ZipScriptReader } from './script-readers';
import { searchYGOProYpk } from '../utility/search-zips';
import type { ScriptReaderFn, WithFinalizer } from '../types/callback';

export async function DirScriptReaderEx(
  ...baseDirs: string[]
): Promise<ScriptReader> {
  const fsReader = DirScriptReader(...baseDirs);

  const zipInputs: Uint8Array[] = [];
  for await (const ypkBytes of searchYGOProYpk(...baseDirs)) {
    zipInputs.push(ypkBytes);
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
    apply: (path) =>
      applyReader(fsReader, path) ?? applyReader(zipReader, path),
    finalize: () => {
      finalizeReader(fsReader);
      finalizeReader(zipReader);
    },
  };
}
