import { OcgcoreModule } from './vendor/libocgcore.shared';
import { OcgcoreDuel } from './ocgcore-duel';
import { CardDataInput, CardDataStructInstance } from './types/card-data';
import { CardDataStruct } from './structs/card-data';
import { OcgcoreMessageType } from './types/ocgcore-enums';
import { ScriptReader } from './types/ocgcore-readers';

export class OcgcoreWrapper {
  private scriptBufferPtr = 0;
  private scriptBufferSize = 0;
  private logBufferPtr = 0;
  private logBufferSize = 0;
  private tmpStringBufferPtr = 0;
  private tmpStringBufferSize = 0;

  private scriptReaderFunc = 0;
  private cardReaderFunc = 0;
  private messageHandlerFunc = 0;

  private heapU8: Uint8Array;
  private heapView: DataView;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder('utf-8');
  private duels = new Map<number, OcgcoreDuel>();

  constructor(
    public ocgcoreModule: OcgcoreModule,
    options?: { scriptBufferSize?: number; logBufferSize?: number },
  ) {
    this.heapU8 = ocgcoreModule.HEAPU8 as Uint8Array;
    this.heapView = new DataView(this.heapU8.buffer);
    this.scriptBufferSize = options?.scriptBufferSize ?? 0x100000;
    this.logBufferSize = options?.logBufferSize ?? 1024;
  }

  getUTF8String(ptr: number): string {
    let length = 0;
    while (this.heapU8[ptr + length] !== 0) {
      length++;
    }
    return this.decoder.decode(this.heapU8.subarray(ptr, ptr + length));
  }

  setHeap(ptr: number, data: Uint8Array): void {
    this.heapU8.set(data, ptr);
  }

  copyHeap(ptr: number, length: number): Uint8Array {
    return this.heapU8.slice(ptr, ptr + length);
  }

  useTmpData<R>(
    cb: (...args: number[]) => R,
    ...args: Array<string | Uint8Array>
  ): R {
    const encoded = args.map((item) =>
      typeof item === 'string' ? this.encoder.encode(item) : item,
    );
    const totalLength = encoded.reduce((acc, bytes) => acc + bytes.length + 1, 0);
    if (totalLength > this.tmpStringBufferSize) {
      if (this.tmpStringBufferPtr) {
        this.ocgcoreModule._free(this.tmpStringBufferPtr);
      }
      this.tmpStringBufferPtr = this.ocgcoreModule._malloc(totalLength);
      this.tmpStringBufferSize = totalLength;
    }

    let offset = 0;
    const ptrs = encoded.map((bytes) => {
      const ptr = this.tmpStringBufferPtr + offset;
      this.heapU8.set(bytes, ptr);
      this.heapU8[ptr + bytes.length] = 0;
      offset += bytes.length + 1;
      return ptr;
    });

    return cb(...ptrs);
  }

  private createFunction(
    fn: (...args: number[]) => number | void,
    signature: string,
  ): number {
    return this.ocgcoreModule.addFunction(fn, signature);
  }

  addFunction(fn: (...args: number[]) => number | void, signature: string): number {
    return this.ocgcoreModule.addFunction(fn, signature);
  }

  removeFunction(index: number): void {
    this.ocgcoreModule.removeFunction(index);
  }

  createDuel(seed: number): OcgcoreDuel {
    const duelPtr = this.ocgcoreModule._create_duel(seed);
    return this.getOrCreateDuel(duelPtr);
  }

  createDuelV2(seedSequence: number[]): OcgcoreDuel {
    const count = seedSequence.length;
    const byteLength = count * 4;
    const ptr = this.ocgcoreModule._malloc(byteLength);
    const view = new Uint32Array(this.heapU8.buffer, ptr, count);
    for (let i = 0; i < count; i++) {
      view[i] = seedSequence[i] >>> 0;
    }
    const duelPtr = this.ocgcoreModule._create_duel_v2(ptr);
    this.ocgcoreModule._free(ptr);
    return this.getOrCreateDuel(duelPtr);
  }

  defaultScriptReader(namePtr: number, dataPtr: number): number {
    return this.ocgcoreModule._default_script_reader(namePtr, dataPtr);
  }

  malloc(size: number): number {
    return this.ocgcoreModule._malloc(size);
  }

  free(ptr: number): void {
    this.ocgcoreModule._free(ptr);
  }

  _setScriptReader(funcPtr: number): void {
    this.ocgcoreModule._set_script_reader(funcPtr);
  }

  _setCardReader(funcPtr: number): void {
    this.ocgcoreModule._set_card_reader(funcPtr);
  }

  _setMessageHandler(funcPtr: number): void {
    this.ocgcoreModule._set_message_handler(funcPtr);
  }

  stdioExit(): void {
    this.ocgcoreModule.___stdio_exit();
  }

  setScriptReader(reader: ScriptReader): void {
    if (this.scriptReaderFunc) {
      this.ocgcoreModule.removeFunction(this.scriptReaderFunc);
    }

    if (!this.scriptBufferPtr) {
      this.scriptBufferPtr = this.ocgcoreModule._malloc(this.scriptBufferSize);
    }

    this.scriptReaderFunc = this.createFunction((scriptPtr, lenPtr) => {
      const scriptPath = this.getUTF8String(scriptPtr);
      const content = reader(scriptPath);
      if (content == null) {
        return 0;
      }

      const bytes =
        typeof content === 'string' ? this.encoder.encode(content) : content;
      if (bytes.length > this.scriptBufferSize) {
        this.ocgcoreModule._free(this.scriptBufferPtr);
        this.scriptBufferPtr = this.ocgcoreModule._malloc(bytes.length);
        this.scriptBufferSize = bytes.length;
      }

      this.heapU8.set(bytes, this.scriptBufferPtr);
      this.heapView.setInt32(lenPtr, bytes.length, true);
      return this.scriptBufferPtr;
    }, 'iii');

    this._setScriptReader(this.scriptReaderFunc);
  }

  setCardReader(reader: (cardId: number) => CardDataInput): void {
    if (this.cardReaderFunc) {
      this.ocgcoreModule.removeFunction(this.cardReaderFunc);
    }

    this.cardReaderFunc = this.createFunction((cardId, cardDataPtr) => {
      const data = reader(cardId);
      if (!data) {
        return 0;
      }

      const CardDataCtor = CardDataStruct as unknown as { new (): CardDataStructInstance };
      let buf: Uint8Array;
      if (data instanceof CardDataCtor) {
        buf = CardDataStruct.raw(data) as Uint8Array;
      } else {
        const cardData = new CardDataCtor();
        cardData.code = data.code;
        cardData.alias = data.alias;
        const targetSetcode = cardData.setcode;
        targetSetcode.fill(0);
        if (data.setcode instanceof Uint16Array && data.setcode.length === 16) {
          targetSetcode.set(data.setcode);
        } else {
          for (let i = 0; i < 16 && i < data.setcode.length; i++) {
            targetSetcode[i] = data.setcode[i];
          }
        }
        cardData.type = data.type;
        cardData.level = data.level;
        cardData.attribute = data.attribute;
        cardData.race = data.race;
        cardData.attack = data.attack;
        cardData.defense = data.defense;
        cardData.lscale = data.lscale;
        cardData.rscale = data.rscale;
        cardData.linkMarker = data.linkMarker;
        buf = CardDataStruct.raw(cardData) as Uint8Array;
      }

      this.heapU8.set(buf, cardDataPtr);
      return 0;
    }, 'iii');

    this._setCardReader(this.cardReaderFunc);
  }

  setMessageHandler(
    handler: (
      duel: OcgcoreDuel,
      message: string,
      type: OcgcoreMessageType | number,
    ) => void,
  ): void {
    if (!this.logBufferPtr) {
      this.logBufferPtr = this.ocgcoreModule._malloc(this.logBufferSize);
    }
    if (this.messageHandlerFunc) {
      this.ocgcoreModule.removeFunction(this.messageHandlerFunc);
    }
    this.messageHandlerFunc = this.createFunction((duelPtr, messageType) => {
      this.ocgcoreModule._get_log_message(duelPtr, this.logBufferPtr);
      const message = this.getUTF8String(this.logBufferPtr);
      const type =
        messageType === 1
          ? OcgcoreMessageType.ScriptError
          : messageType === 2
            ? OcgcoreMessageType.DebugMessage
            : messageType;
      handler(this.getOrCreateDuel(duelPtr), message, type);
    }, 'iii');
    this._setMessageHandler(this.messageHandlerFunc);
  }

  getOrCreateDuel(duelPtr: number): OcgcoreDuel {
    const existing = this.duels.get(duelPtr);
    if (existing) {
      return existing;
    }
    const duel = new OcgcoreDuel(this, duelPtr);
    this.duels.set(duelPtr, duel);
    return duel;
  }

  forgetDuel(duelPtr: number): void {
    this.duels.delete(duelPtr);
  }

  finalize(): void {
    if (this.scriptReaderFunc) {
      this.ocgcoreModule.removeFunction(this.scriptReaderFunc);
      this.scriptReaderFunc = 0;
    }
    if (this.cardReaderFunc) {
      this.ocgcoreModule.removeFunction(this.cardReaderFunc);
      this.cardReaderFunc = 0;
    }
    if (this.messageHandlerFunc) {
      this.ocgcoreModule.removeFunction(this.messageHandlerFunc);
      this.messageHandlerFunc = 0;
    }

    if (this.scriptBufferPtr) {
      this.ocgcoreModule._free(this.scriptBufferPtr);
      this.scriptBufferPtr = 0;
      this.scriptBufferSize = 0;
    }
    if (this.logBufferPtr) {
      this.ocgcoreModule._free(this.logBufferPtr);
      this.logBufferPtr = 0;
      this.logBufferSize = 0;
    }
    if (this.tmpStringBufferPtr) {
      this.ocgcoreModule._free(this.tmpStringBufferPtr);
      this.tmpStringBufferPtr = 0;
      this.tmpStringBufferSize = 0;
    }
  }
}
