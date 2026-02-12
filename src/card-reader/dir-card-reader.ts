import type { CardReaderFinalized } from '../types/callback';
import { searchYGOProResource } from '../utility/search-zips';
import { SqljsCardReader } from './sqljs-card-reader';
import type { Database, SqlJsStatic } from 'sql.js';

function isRootCdbEntry(entryName: string): boolean {
  const normalized = entryName.replace(/\\/g, '/').replace(/^\.?\//, '');
  return !normalized.includes('/') && normalized.toLowerCase().endsWith('.cdb');
}

export async function DirCardReader(
  sqljs: SqlJsStatic,
  ...baseDirs: string[]
): Promise<CardReaderFinalized> {
  const dbs: Database[] = [];
  for await (const resource of searchYGOProResource(...baseDirs)) {
    const isCdb = resource.zipPath
      ? isRootCdbEntry(resource.path)
      : resource.path.toLowerCase().endsWith('.cdb');
    if (!isCdb) {
      continue;
    }
    try {
      const content = await resource.read();
      dbs.push(new sqljs.Database(content));
    } catch {
      continue;
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
