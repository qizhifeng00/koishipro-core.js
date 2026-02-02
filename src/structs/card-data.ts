import {
  BinaryField,
  fillBinaryFields,
  toBinaryFields,
} from 'ygopro-msg-encode';

export class CardDataStruct {
  @BinaryField('u32', 0)
  code!: number;

  @BinaryField('u32', 4)
  alias!: number;

  @BinaryField('u16', 8, 16)
  setcode!: Uint16Array;

  @BinaryField('u32', 40)
  type!: number;

  @BinaryField('u32', 44)
  level!: number;

  @BinaryField('u32', 48)
  attribute!: number;

  @BinaryField('u32', 52)
  race!: number;

  @BinaryField('i32', 56)
  attack!: number;

  @BinaryField('i32', 60)
  defense!: number;

  @BinaryField('u32', 64)
  lscale!: number;

  @BinaryField('u32', 68)
  rscale!: number;

  @BinaryField('u32', 72)
  linkMarker!: number;

  static fromBytes(data: Uint8Array): CardDataStruct {
    const obj = new CardDataStruct();
    fillBinaryFields(obj, data, CardDataStruct);
    return obj;
  }

  toBytes(): Uint8Array {
    return toBinaryFields(this, CardDataStruct);
  }
}
