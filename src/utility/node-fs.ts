export type NodeFs = {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string) => Uint8Array;
};

export function getNodeFs(noThrow = false): NodeFs | null {
  const req =
    (typeof require !== 'undefined' && require) ||
    (Function('return typeof require !== "undefined" && require')() as
      | ((id: string) => unknown)
      | false);
  if (!req) {
    if (noThrow) {
      return null;
    }
    throw new Error('Node.js fs module is not available.');
  }
  try {
    return req('node:fs') as NodeFs;
  } catch {
    try {
      return req('fs') as NodeFs;
    } catch {
      if (noThrow) {
        return null;
      }
      throw new Error('Node.js fs module is not available.');
    }
  }
}
