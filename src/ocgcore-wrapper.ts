import { OcgcoreModule } from './vendor/libocgcore.shared';
import { OcgcoreDuel } from './ocgcore-duel';
import { CardDataEntry } from 'ygopro-cdb-encode';
import { OcgcoreMessageType } from './types/ocgcore-enums';
import {
  CardReader,
  CardReaderFn,
  MessageHandler,
  MessageHandlerFn,
  ScriptReader,
  ScriptReaderFn,
  WithFinalizer,
} from './types/callback';

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

      const buf = data.toPayload();
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
        content = this.applyCallback<ScriptReaderFn>(reader, scriptPath);
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

  readCard(cardId: number): CardDataEntry | null {
    let data: Partial<CardDataEntry> | null | undefined;
    for (const reader of this.cardReaders) {
      try {
        data = this.applyCallback<CardReaderFn>(reader, cardId);
      } catch {
        data = null;
      }
      if (data) {
        break;
      }
    }
    if (!data) {
      return null;
    }
    if (data instanceof CardDataEntry) {
      return data;
    }
    return new CardDataEntry().fromPartial(data);
  }

  handleMessage(
    duel: OcgcoreDuel,
    message: string,
    type: OcgcoreMessageType,
  ): void {
    for (const handler of this.messageHandlers) {
      try {
        this.applyCallback<MessageHandlerFn>(handler, duel, message, type);
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
    if (!this.ocgcoreModule) return;
    for (const duel of this.duels.values()) {
      try {
        duel.endDuel();
      } catch {
        // ignore duel cleanup errors
      }
    }
    this.duels.clear();

    for (const reader of this.scriptReaders) {
      this.finalizeCallback(reader);
    }
    for (const reader of this.cardReaders) {
      this.finalizeCallback(reader);
    }
    for (const handler of this.messageHandlers) {
      this.finalizeCallback(handler);
    }

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

    try {
      this.ocgcoreModule._ocgcore_shutdown?.(0);
    } catch {
      // ignore shutdown errors
    }
    this.ocgcoreModule = undefined;
  }

  private applyCallback<F extends (...args: any[]) => any>(
    cb: WithFinalizer<F>,
    ...args: Parameters<F>
  ): ReturnType<F> {
    if (typeof cb === 'function') {
      return cb(...args);
    }
    return cb.apply(...args);
  }

  private finalizeCallback<F extends (...args: any[]) => any>(
    cb: WithFinalizer<F>,
  ): void {
    if (typeof cb === 'function') {
      return;
    }
    try {
      cb.finalize?.();
    } catch {
      // ignore finalizer errors
    }
  }
}
