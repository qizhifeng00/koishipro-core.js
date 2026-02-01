export type NodeRequire = (id: string) => unknown;

export function loadNodeModule<T>(id: string, altId?: string): T | null {
  const req = new Function(
    'return typeof require !== "undefined" ? require : undefined'
  )() as NodeRequire | undefined;
  if (!req) {
    return null;
  }
  try {
    return req(id) as T;
  } catch {
    if (!altId) return null;
    try {
      return req(altId) as T;
    } catch {
      return null;
    }
  }
}
