export enum OcgcoreMessageType {
  ScriptError = 'ScriptError',
  DebugMessage = 'DebugMessage',
}

export enum OcgcoreDuelRule {
  Rule1 = 1,
  Rule2 = 2,
  MasterRule3 = 3,
  NewMasterRule = 4,
  MasterRule2020 = 5,
}

export enum OcgcoreDuelOptionFlag {
  TestMode = 0x01,
  AttackFirstTurn = 0x02,
  ObsoleteRuling = 0x08,
  PseudoShuffle = 0x10,
  TagMode = 0x20,
  SimpleAI = 0x40,
  ReturnDeckTop = 0x80,
  RevealDeckSeq = 0x100,
}
