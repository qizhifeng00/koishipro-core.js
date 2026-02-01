import Struct from 'typed-struct';

export const CardDataStruct = new Struct()
  .UInt32LE('code')
  .UInt32LE('alias')
  .UInt16Array('setcode', 16)
  .UInt32LE('type')
  .UInt32LE('level')
  .UInt32LE('attribute')
  .UInt32LE('race')
  .Int32LE('attack')
  .Int32LE('defense')
  .UInt32LE('lscale')
  .UInt32LE('rscale')
  .UInt32LE('linkMarker')
  .compile();
