const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8');

export function encodeUtf8(value: string): Uint8Array {
  return encoder.encode(value);
}

export function decodeUtf8(value: Uint8Array): string {
  return decoder.decode(value);
}
