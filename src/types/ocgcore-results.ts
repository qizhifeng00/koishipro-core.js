export interface OcgcoreBinaryResult {
  length: number;
  raw: Uint8Array;
}

export interface OcgcoreCardLocationRef {
  controller: number;
  location: number;
  sequence: number;
}

export interface OcgcoreCounterInfo {
  type: number;
  count: number;
}

export interface OcgcoreCardInfo {
  flags: number;
  empty: boolean;
  code?: number;
  position?: number;
  alias?: number;
  type?: number;
  level?: number;
  rank?: number;
  attribute?: number;
  race?: number;
  attack?: number;
  defense?: number;
  baseAttack?: number;
  baseDefense?: number;
  reason?: number;
  equipCard?: OcgcoreCardLocationRef;
  targetCards?: OcgcoreCardLocationRef[];
  overlayCards?: number[];
  counters?: OcgcoreCounterInfo[];
  owner?: number;
  status?: number;
  lscale?: number;
  rscale?: number;
  link?: number;
  linkMarker?: number;
}

export interface OcgcoreCardQueryResult extends OcgcoreBinaryResult {
  card: OcgcoreCardInfo | null;
}

export interface OcgcoreFieldCardQueryResult extends OcgcoreBinaryResult {
  cards: OcgcoreCardInfo[];
}

export interface OcgcoreMessageResult extends OcgcoreBinaryResult {}

export interface OcgcoreFieldInfoPlayerState {
  lp: number;
  mzone: Array<{ occupied: boolean; position?: number; xyzCount?: number }>;
  szone: Array<{ occupied: boolean; position?: number }>;
  deckCount: number;
  handCount: number;
  graveCount: number;
  removedCount: number;
  extraCount: number;
  extraPCount: number;
}

export interface OcgcoreFieldInfoChain {
  code: number;
  chainCard: OcgcoreCardLocationRef & { subSequence: number };
  trigger: OcgcoreCardLocationRef;
  description: number;
}

export interface OcgcoreFieldInfo {
  message: number;
  duelRule: number;
  players: [OcgcoreFieldInfoPlayerState, OcgcoreFieldInfoPlayerState];
  chains: OcgcoreFieldInfoChain[];
}

export interface OcgcoreFieldInfoResult extends OcgcoreBinaryResult {
  field: OcgcoreFieldInfo;
}

export interface OcgcoreRegistryValueResult extends OcgcoreBinaryResult {
  value: Uint8Array;
  text?: string;
}

export interface OcgcoreRegistryKeysResult extends OcgcoreBinaryResult {
  keys: string[];
}

export interface OcgcoreRegistryDumpEntry {
  key: string;
  value: Uint8Array;
  valueText?: string;
}

export interface OcgcoreRegistryDumpResult extends OcgcoreBinaryResult {
  entries: OcgcoreRegistryDumpEntry[];
}
