export const OCGCORE_DUEL_SNAPSHOT_VERSION = 1;

const SNAPSHOT_MAGIC = new Uint8Array([
  0x4b, 0x4f, 0x43, 0x47, 0x53, 0x4e, 0x50, 0x31,
]);
const HEADER_SIZE = SNAPSHOT_MAGIC.length + 4;

export interface OcgcoreWrapperSnapshotState {
  scriptBufferPtr: number;
  scriptBufferSize: number;
  logBufferPtr: number;
  logBufferSize: number;
  tmpStringBufferPtr: number;
  tmpStringBufferSize: number;
}

export interface OcgcoreDuelSnapshotState {
  duelPtr: number;
  returnPtr: number;
  receivePtr: number;
}

export interface OcgcoreDuelSnapshotMetadata {
  version: typeof OCGCORE_DUEL_SNAPSHOT_VERSION;
  memoryByteLength: number;
  duel: OcgcoreDuelSnapshotState;
  wrapper: OcgcoreWrapperSnapshotState;
}

export interface DecodedOcgcoreDuelSnapshot {
  metadata: OcgcoreDuelSnapshotMetadata;
  memory: Uint8Array;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8');

function assertSnapshotMagic(input: Uint8Array): void {
  if (input.length < HEADER_SIZE) {
    throw new Error('Invalid ocgcore duel snapshot: truncated header');
  }
  for (let i = 0; i < SNAPSHOT_MAGIC.length; i++) {
    if (input[i] !== SNAPSHOT_MAGIC[i]) {
      throw new Error('Invalid ocgcore duel snapshot: bad magic');
    }
  }
}

function assertSnapshotMetadata(metadata: OcgcoreDuelSnapshotMetadata): void {
  if (metadata.version !== OCGCORE_DUEL_SNAPSHOT_VERSION) {
    throw new Error(
      `Unsupported ocgcore duel snapshot version: ${metadata.version}`,
    );
  }
  if (!Number.isSafeInteger(metadata.memoryByteLength)) {
    throw new Error('Invalid ocgcore duel snapshot: bad memory length');
  }
  if (!metadata.duel || !metadata.wrapper) {
    throw new Error('Invalid ocgcore duel snapshot: missing state');
  }
  for (const [name, value] of Object.entries(metadata.duel)) {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`Invalid ocgcore duel snapshot: bad duel ${name}`);
    }
  }
  for (const [name, value] of Object.entries(metadata.wrapper)) {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`Invalid ocgcore duel snapshot: bad wrapper ${name}`);
    }
  }
}

export function encodeOcgcoreDuelSnapshot(
  metadata: OcgcoreDuelSnapshotMetadata,
  memory: Uint8Array,
): Uint8Array {
  if (metadata.memoryByteLength !== memory.byteLength) {
    throw new Error('Invalid ocgcore duel snapshot: memory length mismatch');
  }
  const metadataBytes = encoder.encode(JSON.stringify(metadata));
  const output = new Uint8Array(
    HEADER_SIZE + metadataBytes.byteLength + memory.byteLength,
  );
  output.set(SNAPSHOT_MAGIC, 0);
  new DataView(output.buffer, output.byteOffset, output.byteLength).setUint32(
    SNAPSHOT_MAGIC.length,
    metadataBytes.byteLength,
    true,
  );
  output.set(metadataBytes, HEADER_SIZE);
  output.set(memory, HEADER_SIZE + metadataBytes.byteLength);
  return output;
}

export function decodeOcgcoreDuelSnapshot(
  input: Uint8Array,
): DecodedOcgcoreDuelSnapshot {
  assertSnapshotMagic(input);
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const metadataLength = view.getUint32(SNAPSHOT_MAGIC.length, true);
  const memoryOffset = HEADER_SIZE + metadataLength;
  if (memoryOffset > input.byteLength) {
    throw new Error('Invalid ocgcore duel snapshot: truncated metadata');
  }

  const metadata = JSON.parse(
    decoder.decode(input.subarray(HEADER_SIZE, memoryOffset)),
  ) as OcgcoreDuelSnapshotMetadata;
  assertSnapshotMetadata(metadata);

  const memory = input.subarray(memoryOffset);
  if (metadata.memoryByteLength !== memory.byteLength) {
    throw new Error('Invalid ocgcore duel snapshot: memory length mismatch');
  }

  return {
    metadata,
    memory,
  };
}
