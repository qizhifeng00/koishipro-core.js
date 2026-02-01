export function readU8(buf: Uint8Array, offset: number): number {
  return buf[offset] ?? 0;
}

export function readU16(buf: Uint8Array, offset: number): number {
  return new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getUint16(
    offset,
    true,
  );
}

export function readI32(buf: Uint8Array, offset: number): number {
  return new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getInt32(
    offset,
    true,
  );
}

export function readU32(buf: Uint8Array, offset: number): number {
  return new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getUint32(
    offset,
    true,
  );
}
