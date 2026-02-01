export type ScriptReader = (
  path: string,
) => string | Uint8Array | null | undefined;
