export function getNodeModuleOrThrow<T>(value: T | null, label: string): T {
  if (!value) {
    throw new Error(`${label} is not supported in this runtime.`);
  }
  return value;
}
