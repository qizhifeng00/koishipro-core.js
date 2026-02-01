import JSZip from 'jszip';

import { ScriptReader } from '../types/ocgcore-readers';
import { getNodeFs } from '../utility/node-fs';
import { getNodePath } from '../utility/node-path';

const SCRIPT_PREFIX = './script/';

function normalizePath(input: string): string {
  let path = input.replace(/\\/g, '/');
  if (path.startsWith(SCRIPT_PREFIX)) {
    path = path.slice(SCRIPT_PREFIX.length);
  }
  return path;
}

function buildCandidates(filename: string): string[] {
  const entries = [
    filename,
    `specials/${filename}`,
    `expansions/script/${filename}`,
    `script/${filename}`,
  ];
  const candidates: string[] = [];
  for (const entry of entries) {
    candidates.push(entry);
    if (!entry.startsWith('./')) {
      const dotEntry = entry.startsWith('/')
        ? `./${entry.slice(1)}`
        : `./${entry}`;
      candidates.push(dotEntry);
    }
  }
  return candidates;
}

function joinPath(baseDir: string, relativePath: string): string {
  const pathMod = getNodePath();
  if (pathMod) {
    return pathMod.join(baseDir, relativePath);
  }
  const trimmedBase = baseDir.replace(/[/\\]+$/, '');
  const trimmedRel = relativePath.replace(/^[/\\]+/, '');
  return `${trimmedBase}/${trimmedRel}`;
}

export function MapReader(
  ...maps: Array<Map<string, string | Uint8Array>>
): ScriptReader {
  return (path) => {
    const filename = normalizePath(path);
    if (!filename.toLowerCase().endsWith('.lua')) {
      return null;
    }
    const candidates = buildCandidates(filename);
    for (const candidate of candidates) {
      for (const map of maps) {
        if (map.has(candidate)) {
          return map.get(candidate) ?? null;
        }
      }
    }
    return null;
  };
}

export function DirReader(...baseDirs: string[]): ScriptReader {
  const fs = getNodeFs();
  return (path) => {
    const filename = normalizePath(path);
    if (!filename.toLowerCase().endsWith('.lua')) {
      return null;
    }
    const candidates = buildCandidates(filename);
    for (const baseDir of baseDirs) {
      for (const candidate of candidates) {
        const normalized = candidate.startsWith('/')
          ? candidate.slice(1)
          : candidate;
        const fullPath = joinPath(baseDir, normalized);
        if (fs.existsSync(fullPath)) {
          return fs.readFileSync(fullPath);
        }
      }
    }
    return null;
  };
}

function normalizeZipEntryName(name: string): string[] {
  const normalized = name.replace(/\\/g, '/').replace(/^\.?\//, '');
  const names = new Set<string>();
  names.add(normalized);
  if (normalized.startsWith('script/')) {
    names.add(normalized.slice('script/'.length));
  }
  return Array.from(names);
}

export async function ZipReader(
  ...inputs: Array<Uint8Array | ArrayBuffer | Blob>
): Promise<ScriptReader> {
  const maps = await Promise.all(
    inputs.map(async (data) => {
      const zip = await JSZip.loadAsync(data);
      const map = new Map<string, string | Uint8Array>();
      const entries = Object.values(zip.files);
      await Promise.all(
        entries.map(async (entry) => {
          if (entry.dir) {
            return;
          }
          if (!entry.name.toLowerCase().endsWith('.lua')) {
            return;
          }
          const content = await entry.async('uint8array');
          for (const name of normalizeZipEntryName(entry.name)) {
            map.set(name, content);
          }
        }),
      );
      return map;
    }),
  );
  return MapReader(...maps);
}
