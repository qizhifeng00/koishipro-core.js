export function loadNodeModule<T>(id: string): T | null {
  const req =
    typeof module.require !== 'undefined' ? module.require : undefined;
  if (!req) {
    return null;
  }
  const nodeId = id.startsWith('node:') ? id : `node:${id}`;
  try {
    return req(nodeId) as T;
  } catch {
    try {
      return req(id) as T;
    } catch {
      return null;
    }
  }
}

export function loadNodeModuleOrThrow<T>(
  id: string,
  errorMessage: string,
): T {
  const mod = loadNodeModule<T>(id);
  if (mod) {
    return mod;
  }
  throw new Error(errorMessage);
}
