import type { ScriptReaderFn } from '../types/callback';
import { DirScriptReader, ZipScriptReader } from './script-readers';
import { searchYGOProYpk } from '../utility/search-zips';

export async function DirScriptReaderEx(
  ...baseDirs: string[]
): Promise<ScriptReaderFn> {
  const fsReader = DirScriptReader(...baseDirs);

  const zipInputs: Uint8Array[] = [];
  for await (const ypkBytes of searchYGOProYpk(...baseDirs)) {
    zipInputs.push(ypkBytes);
  }

  if (zipInputs.length === 0) {
    return fsReader;
  }

  const zipReader = await ZipScriptReader(...zipInputs);

  return (path) => fsReader(path) ?? zipReader(path);
}
