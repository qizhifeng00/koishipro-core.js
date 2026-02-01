export function loadNodeModule<T>(id: string, altId?: string): T | null {
  const req =
    typeof module.require !== 'undefined' ? module.require : undefined;
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
