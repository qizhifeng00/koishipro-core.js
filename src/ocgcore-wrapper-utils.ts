import type { OcgcoreFactory } from './vendor/libocgcore.shared';

type OcgcoreFactoryModule = { default?: OcgcoreFactory } | OcgcoreFactory;

export function normalizeOcgcoreFactory(mod: unknown): OcgcoreFactory {
  const typed = mod as OcgcoreFactoryModule;
  if (typeof typed === 'function') {
    return typed as OcgcoreFactory;
  }
  if (typed && typeof (typed as { default?: unknown }).default === 'function') {
    return (typed as { default: OcgcoreFactory }).default;
  }
  throw new Error('Invalid ocgcore factory module');
}
