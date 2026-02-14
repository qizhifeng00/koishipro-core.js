import { OcgcoreDuel } from '../src/ocgcore-duel';
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
    const duel = new OcgcoreDuel({} as any, 1);
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
