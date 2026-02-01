import { Buffer } from 'buffer';

if (typeof globalThis !== 'undefined' && !(globalThis as { Buffer?: unknown }).Buffer) {
  (globalThis as { Buffer?: unknown }).Buffer = Buffer;
}

export * from './src/ocgcore-wrapper';
export * from './src/ocgcore-duel';
export * from './src/types';
export * from './src/structs';
export * from './src/adapters';
export * from './src/constants';
export * from './src/utility';
