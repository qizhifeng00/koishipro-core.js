import {
  IndexResponse,
  IndexResponseObject,
  YGOProMsgSelectCard,
  YGOProMsgSelectSum,
  YGOProMsgSelectTribute,
  YGOProMsgSelectUnselectCard,
} from 'ygopro-msg-encode';
import { MapAdvancor, MapAdvancorHandler } from './map-advancor';

export interface SelectCardFilter {
  code?: number;
  location?: number;
  controller?: number;
  sequence?: number;
}

export const SelectCardAdvancor = (...cards: SelectCardFilter[]) => {
  const remainingCards = cards.slice();
  const applyFilter = <T extends SelectCardFilter>(
    items: T[],
    filter: SelectCardFilter,
  ): T[] => {
    return items.filter((item) =>
      Object.entries(filter).every(
        ([key, value]) => value == null || item[key as keyof T] === value,
      ),
    );
  };

  const pickCard = <T extends SelectCardFilter>(
    items: T[],
    min: number,
    max: number,
  ): Array<IndexResponseObject | undefined> => {
    const picked: Array<IndexResponseObject> = [];

    // 标记哪些 item / filter 已经被用掉
    const usedIndices = new Set<number>();
    const usedFilters = new Set<SelectCardFilter>();

    for (const filter of remainingCards) {
      if (picked.length >= max) break;

      let matchIndex = -1;
      for (let i = 0; i < items.length; i++) {
        if (usedIndices.has(i)) continue;
        if (applyFilter([items[i]], filter).length === 1) {
          matchIndex = i;
          break;
        }
      }

      if (matchIndex < 0) continue;

      picked.push(IndexResponse(matchIndex));
      usedIndices.add(matchIndex);
      usedFilters.add(filter);
    }

    if (picked.length < min) {
      return undefined;
    }

    // 消耗 remainingCards（顺序保持）
    for (let i = remainingCards.length - 1; i >= 0; i--) {
      if (usedFilters.has(remainingCards[i])) {
        remainingCards.splice(i, 1);
      }
    }

    return picked;
  };

  return MapAdvancor(
    MapAdvancorHandler(YGOProMsgSelectCard, (msg) => {
      const picked = pickCard(msg.cards, msg.min, msg.max);
      if (picked) {
        return msg.prepareResponse(picked);
      }
    }),
    MapAdvancorHandler(YGOProMsgSelectUnselectCard, (msg) => {
      const picked = pickCard(msg.selectableCards, 1, 1);
      if (picked) {
        return msg.prepareResponse(picked[0]);
      }
    }),
    MapAdvancorHandler(YGOProMsgSelectSum, (msg) => {
      const decodeOpParam = (opParam: number) => {
        const u = opParam >>> 0;

        // highest bit set -> low 31 bits is amount
        if ((u & 0x8000_0000) !== 0) {
          return { amount: u & 0x7fff_ffff, extra: 0 };
        }

        // else low 16 is amount, high 16 is extra (if >0 meaningful)
        return { amount: u & 0xffff, extra: (u >>> 16) & 0xffff };
      };

      const amountOf = (c: any) => decodeOpParam(c.opParam).amount;

      // must：已经选了，只作为基数参与计算（不需要返回 index）
      const mustSum = (msg.mustSelectCards ?? []).reduce(
        (acc, c) => acc + amountOf(c as any),
        0,
      );

      const mustCount = (msg.mustSelectCards ?? []).length;

      // 记录“新增选择”的 indices（按 cards 的 index）
      const pickedIdx: number[] = [];
      const pickedIdxSet = new Set<number>();

      const totalSum = () =>
        mustSum +
        pickedIdx.reduce((acc, i) => acc + amountOf(msg.cards[i] as any), 0);
      const totalCount = () => mustCount + pickedIdx.length;

      // ✅ 用 remainingCards 先做“意图匹配”，但先不消耗 remainingCards
      // filterIdx -> matched card index
      const filterMatch = new Map<number, number>();

      for (let fi = 0; fi < remainingCards.length; fi++) {
        const f = remainingCards[fi];
        const idx = msg.cards.findIndex(
          (c, i) =>
            !pickedIdxSet.has(i) && applyFilter([c as any], f).length === 1,
        );
        if (idx < 0) continue;

        pickedIdx.push(idx);
        pickedIdxSet.add(idx);
        filterMatch.set(fi, idx);
      }

      // 定稿后消耗 remainingCards：只消耗“最终确实被选中的”那部分 filters
      const consumeRemainingByFinalPick = () => {
        const usedFilterIdx = new Set<number>();
        for (const [fi, idx] of filterMatch.entries()) {
          if (pickedIdxSet.has(idx)) usedFilterIdx.add(fi);
        }
        for (let i = remainingCards.length - 1; i >= 0; i--) {
          if (usedFilterIdx.has(i)) remainingCards.splice(i, 1);
        }
      };

      const target = msg.sumVal;

      // ===== mode === 1：min/max 无效；选到 total >= target 且新增集合最小充分 =====
      if (msg.mode === 1) {
        // 1) 从左到右补齐到 total >= target
        let s = totalSum();
        if (s < target) {
          for (let i = 0; i < msg.cards.length; i++) {
            if (s >= target) break;
            if (pickedIdxSet.has(i)) continue;

            pickedIdx.push(i);
            pickedIdxSet.add(i);
            s += amountOf(msg.cards[i] as any);
          }
        }
        if (s < target) return;

        // 2) 最小充分：只对“新增选择”做删卡（must 不能动）
        //    从右往左删：优先删右边，保留左边
        const removable = (pos: number) => {
          const idx = pickedIdx[pos];
          const v = amountOf(msg.cards[idx] as any);
          return s - v >= target;
        };

        for (let pos = pickedIdx.length - 1; pos >= 0; pos--) {
          if (!removable(pos)) continue;
          const idx = pickedIdx[pos];
          const v = amountOf(msg.cards[idx] as any);
          pickedIdx.splice(pos, 1);
          pickedIdxSet.delete(idx);
          s -= v;
        }

        // 3) 校验：去掉任何一张新增卡都会让 total < target
        for (const idx of pickedIdx) {
          if (s - amountOf(msg.cards[idx] as any) >= target) return;
        }

        consumeRemainingByFinalPick();

        // 回包：只发 cards 的 index
        return msg.prepareResponse(pickedIdx.map((i) => IndexResponse(i)));
      }

      // ===== mode !== 1：按常见语义 totalSum == target，totalCount in [min,max] =====
      const baseSum = mustSum;
      const baseCount = mustCount;

      const sumLeft = target - baseSum;
      const minLeft = Math.max(0, msg.min - baseCount);
      const maxLeft = Math.max(0, msg.max - baseCount);

      // must 已经超额/超数量，直接无解
      if (sumLeft < 0) return;
      if (maxLeft < 0) return;

      // 预先按 filters 选进来的也算“新增”，所以需要从 sumLeft/minLeft/maxLeft 中扣掉
      // 但如果扣完就不可能了，也直接无解
      const preSum = pickedIdx.reduce(
        (acc, i) => acc + amountOf(msg.cards[i] as any),
        0,
      );
      const preCount = pickedIdx.length;

      const sumNeed = sumLeft - preSum;
      const minNeed = Math.max(0, minLeft - preCount);
      const maxNeed = Math.max(0, maxLeft - preCount);

      if (sumNeed < 0) return;
      if (maxNeed < 0) return;

      // DP：从剩余候选里补 sumNeed，数量在 [minNeed,maxNeed]
      const candidates: { idx: number; v: number }[] = [];
      for (let i = 0; i < msg.cards.length; i++) {
        if (pickedIdxSet.has(i)) continue;
        const v = amountOf(msg.cards[i] as any);
        if (v <= sumNeed) candidates.push({ idx: i, v });
      }

      type Node = { prevKey?: string; takeIdx?: number };
      const keyOf = (sum: number, cnt: number) => `${sum}|${cnt}`;
      const dp = new Map<string, Node>();
      dp.set(keyOf(0, 0), {});

      for (const c of candidates) {
        const snapshot = Array.from(dp.keys());
        for (const k of snapshot) {
          const [sStr, cStr] = k.split('|');
          const s = Number(sStr);
          const cnt = Number(cStr);

          const ns = s + c.v;
          const ncnt = cnt + 1;

          if (ns > sumNeed) continue;
          if (ncnt > maxNeed) continue;

          const nk = keyOf(ns, ncnt);
          if (dp.has(nk)) continue; // 左优先：不覆盖

          dp.set(nk, { prevKey: k, takeIdx: c.idx });
        }
      }

      let bestKey: string | undefined;
      for (let cnt = minNeed; cnt <= maxNeed; cnt++) {
        const k = keyOf(sumNeed, cnt);
        if (dp.has(k)) {
          bestKey = k;
          break; // 数量更少优先
        }
      }
      if (!bestKey) return;

      // 回溯补选
      const extraIdx: number[] = [];
      let curKey = bestKey;
      while (curKey !== keyOf(0, 0)) {
        const node = dp.get(curKey)!;
        if (typeof node.takeIdx === 'number') extraIdx.push(node.takeIdx);
        curKey = node.prevKey!;
      }
      extraIdx.reverse();

      for (const i of extraIdx) {
        pickedIdx.push(i);
        pickedIdxSet.add(i);
      }

      // 最终校验 totalCount & totalSum（保险）
      if (totalCount() < msg.min || totalCount() > msg.max) return;
      if (totalSum() !== target) return;

      consumeRemainingByFinalPick();
      return msg.prepareResponse(pickedIdx.map((i) => IndexResponse(i)));
    }),

    MapAdvancorHandler(YGOProMsgSelectTribute, (msg) => {
      const picked = pickCard(msg.cards, msg.min, msg.max);
      if (picked) {
        return msg.prepareResponse(picked);
      }
    }),
  );
};
