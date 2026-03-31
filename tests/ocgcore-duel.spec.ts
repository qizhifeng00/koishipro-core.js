import { OcgcoreDuel } from '../src/ocgcore-duel';
import { QUERY_BUFFER_SIZE, RETURN_BUFFER_SIZE } from '../src/constants';
import { YGOProMsgNewTurn, YGOProMsgSelectYesNo } from 'ygopro-msg-encode';

const concatRaw = (...chunks: Uint8Array[]): Uint8Array => {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const raw = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    raw.set(chunk, offset);
    offset += chunk.length;
  }
  return raw;
};

describe('OcgcoreDuel.advance', () => {
  test('splits multi-message payloads and handles response messages by type', () => {
    const duel = new OcgcoreDuel(
      {
        malloc: jest.fn(() => 100),
        free: jest.fn(),
        forgetDuel: jest.fn(),
        ocgcoreModule: {
          _end_duel: jest.fn(),
        },
      } as any,
      1,
    );
    const responseMessage = new YGOProMsgSelectYesNo();
    const trailingMessage = new YGOProMsgNewTurn();

    const responseRaw = responseMessage.toPayload();
    const trailingRaw = trailingMessage.toPayload();
    const mergedRaw = concatRaw(responseRaw, trailingRaw);

    const process = jest
      .fn()
      .mockReturnValueOnce({
        length: mergedRaw.length,
        raw: mergedRaw,
        status: 1,
        messages: [responseMessage, trailingMessage],
        message: trailingMessage,
      })
      .mockReturnValueOnce({
        length: 0,
        raw: new Uint8Array(0),
        status: 2,
      });
    (duel as any).process = process;

    const setResponse = jest
      .spyOn(duel, 'setResponse')
      .mockImplementation(() => undefined);
    const advancor = jest.fn(() => new Uint8Array([1]));

    const results = Array.from(duel.advance(advancor));

    expect(results).toHaveLength(3);
    expect(results[0].status).toBe(0);
    expect(results[0].raw).toEqual(responseRaw);
    expect(results[0].message).toBe(responseMessage);
    expect(results[0].messages).toEqual([responseMessage]);

    expect(results[1].status).toBe(1);
    expect(results[1].raw).toEqual(trailingRaw);
    expect(results[1].message).toBe(trailingMessage);
    expect(results[1].messages).toEqual([trailingMessage]);

    expect(advancor).toHaveBeenCalledTimes(1);
    expect(advancor).toHaveBeenCalledWith(responseMessage);
    expect(setResponse).toHaveBeenCalledTimes(1);
    expect(setResponse).toHaveBeenCalledWith(new Uint8Array([1]));
  });
});

describe('OcgcoreDuel buffers', () => {
  test('reuses constructor-allocated receivePtr for query and receive paths', () => {
    const malloc = jest
      .fn()
      .mockReturnValueOnce(200)
      .mockReturnValueOnce(400);
    const free = jest.fn();
    const copyHeap = jest.fn(
      (_ptr: number, length: number) => new Uint8Array(length),
    );
    const setHeap = jest.fn();
    const forgetDuel = jest.fn();
    const ocgcoreModule = {
      _end_duel: jest.fn(),
      _start_duel: jest.fn(),
      _process: jest.fn(() => 0),
      _get_message: jest.fn(),
      _query_field_info: jest.fn(() => 0),
      _get_registry_keys: jest.fn(() => 0),
      _set_responseb: jest.fn(),
    };
    const duel = new OcgcoreDuel(
      {
        malloc,
        free,
        copyHeap,
        setHeap,
        forgetDuel,
        ocgcoreModule,
      } as any,
      1,
    );

    duel.process({ noParse: true });
    duel.queryFieldInfo({ noParse: true });
    duel.getRegistryKeys();
    duel.startDuel(0);
    duel.setResponse(new Uint8Array([1, 2, 3]));
    duel.endDuel();

    expect(malloc).toHaveBeenNthCalledWith(1, RETURN_BUFFER_SIZE);
    expect(malloc).toHaveBeenNthCalledWith(2, QUERY_BUFFER_SIZE);
    expect(ocgcoreModule._get_message).toHaveBeenCalledWith(1, 400);
    expect(ocgcoreModule._query_field_info).toHaveBeenCalledWith(1, 400);
    expect(ocgcoreModule._get_registry_keys).toHaveBeenCalledWith(1, 400);
    expect(setHeap).toHaveBeenNthCalledWith(
      1,
      200,
      new Uint8Array(RETURN_BUFFER_SIZE),
    );
    expect(setHeap).toHaveBeenNthCalledWith(2, 200, new Uint8Array([1, 2, 3]));
    expect(ocgcoreModule._set_responseb).toHaveBeenCalledWith(1, 200);
    expect(free).toHaveBeenCalledWith(400);
    expect(free).toHaveBeenCalledWith(200);
    expect(free).toHaveBeenCalledTimes(2);
    expect(malloc).toHaveBeenCalledTimes(2);
    expect(forgetDuel).toHaveBeenCalledWith(1);
  });
});
