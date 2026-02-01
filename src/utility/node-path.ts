export type NodePath = {
  join: (...parts: string[]) => string;
};

export function getNodePath(noThrow = false): NodePath | null {
  const req =
    (typeof require !== 'undefined' && require) ||
    (Function('return typeof require !== "undefined" && require')() as
      | ((id: string) => unknown)
      | false);
  if (!req) {
    if (noThrow) {
      return null;
    }
    throw new Error('Node.js path module is not available.');
  }
  try {
    return req('node:path') as NodePath;
  } catch {
    try {
      return req('path') as NodePath;
    } catch {
      if (noThrow) {
        return null;
      }
      throw new Error('Node.js path module is not available.');
    }
  }
}
