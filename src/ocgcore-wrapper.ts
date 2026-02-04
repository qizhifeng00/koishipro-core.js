import { OcgcoreModule } from './vendor/libocgcore.shared';
import { OcgcoreDuel } from './ocgcore-duel';
import { CardData } from 'ygopro-msg-encode';
import { OcgcoreMessageType } from './types/ocgcore-enums';
import { CardReader, MessageHandler, ScriptReader } from './types/callback';

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

  public scriptReaders: ScriptReader[] = [];
  public cardReaders: CardReader[] = [];
  public messageHandlers: MessageHandler[] = [];

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

    this.scriptReaderFunc = this.createFunction((scriptPtr, lenPtr) => {
      const scriptPath = this.getUTF8String(scriptPtr);
      const content = this.readScript(scriptPath);
      if (content == null) {
        return 0;
      }

      if (!this.scriptBufferPtr) {
        this.scriptBufferPtr = this.ocgcoreModule._malloc(
          this.scriptBufferSize,
        );
      }

      const bytes = content;
      if (bytes.length > this.scriptBufferSize) {
        this.ocgcoreModule._free(this.scriptBufferPtr);
        this.scriptBufferPtr = this.ocgcoreModule._malloc(bytes.length);
        this.scriptBufferSize = bytes.length;
      }

      this.heapU8.set(bytes, this.scriptBufferPtr);
      this.heapView.setInt32(lenPtr, bytes.length, true);
      return this.scriptBufferPtr;
    }, 'iii');
    this.ocgcoreModule._set_script_reader(this.scriptReaderFunc);

    this.cardReaderFunc = this.createFunction((cardId, cardDataPtr) => {
      const data = this.readCard(cardId);
      if (!data) {
        return 0;
      }

      const buf = new CardData().fromPartial(data).toPayload();
      this.heapU8.set(buf, cardDataPtr);
      return 0;
    }, 'iii');
    this.ocgcoreModule._set_card_reader(this.cardReaderFunc);

    this.messageHandlerFunc = this.createFunction((duelPtr, messageType) => {
      if (!this.logBufferPtr) {
        this.logBufferPtr = this.ocgcoreModule._malloc(this.logBufferSize);
      }
      this.ocgcoreModule._get_log_message(duelPtr, this.logBufferPtr);
      const message = this.getUTF8String(this.logBufferPtr);
      const type =
        messageType === 2
          ? OcgcoreMessageType.DebugMessage
          : OcgcoreMessageType.ScriptError;
      const duel = this.getOrCreateDuel(duelPtr);
      this.handleMessage(duel, message, type);
    }, 'iii');
    this.ocgcoreModule._set_message_handler(this.messageHandlerFunc);
  }

  readScript(scriptPath: string): Uint8Array | null {
    let content: string | Uint8Array | null | undefined;
    for (const reader of this.scriptReaders) {
      try {
        content = reader(scriptPath);
      } catch {
        content = null;
      }
      if (content != null) {
        break;
      }
    }
    return typeof content === 'string'
      ? this.encoder.encode(content)
      : (content ?? null);
  }

  readCard(cardId: number): Partial<CardData> | null {
    let data: Partial<CardData> | null | undefined;
    for (const reader of this.cardReaders) {
      try {
        data = reader(cardId);
      } catch {
        data = null;
      }
      if (data) {
        break;
      }
    }
    return data ?? null;
  }

  handleMessage(
    duel: OcgcoreDuel,
    message: string,
    type: OcgcoreMessageType,
  ): void {
    for (const handler of this.messageHandlers) {
      try {
        handler(duel, message, type);
      } catch {
        // ignore handler errors
      }
    }
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
    const totalLength = encoded.reduce(
      (acc, bytes) => acc + bytes.length + 1,
      0,
    );
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

  addFunction(
    fn: (...args: number[]) => number | void,
    signature: string,
  ): number {
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

  _defaultScriptReader(namePtr: number, dataPtr: number): number {
    return this.ocgcoreModule._default_script_reader(namePtr, dataPtr);
  }

  malloc(size: number): number {
    return this.ocgcoreModule._malloc(size);
  }

  free(ptr: number): void {
    this.ocgcoreModule._free(ptr);
  }

  _stdioExit(): void {
    this.ocgcoreModule.___stdio_exit();
  }

  setScriptReader(reader: ScriptReader, reset = false): this {
    if (reset) {
      this.scriptReaders = [];
    }
    this.scriptReaders.push(reader);
    return this;
  }

  setCardReader(reader: CardReader, reset = false): this {
    if (reset) {
      this.cardReaders = [];
    }
    this.cardReaders.push(reader);
    return this;
  }

  setMessageHandler(handler: MessageHandler, reset = false): this {
    if (reset) {
      this.messageHandlers = [];
    }
    this.messageHandlers.push(handler);
    return this;
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
