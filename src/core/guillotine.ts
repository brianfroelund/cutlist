import type { Length } from './model';
import type { Cut, Placement, SheetItem } from './pack2d-types';
import type { Rect } from './rect';

export type FitRule = 'bssf' | 'blsf' | 'baf';
export type SplitRule =
  'shorter-leftover' | 'longer-leftover' | 'max-area' | 'rip-first' | 'cross-first';

interface Orientation {
  iw: Length;
  ih: Length;
  rotated: boolean;
}

export interface SingleSheetResult<T extends SheetItem = SheetItem> {
  placed: Placement<T>[];
  rest: T[];
  cuts: Cut[];
  free: Rect[];
}

function getOrientations(item: SheetItem, kerf: Length): Orientation[] {
  const o1: Orientation = { iw: item.w + kerf, ih: item.h + kerf, rotated: false };
  if (item.rotatable && item.w !== item.h) {
    const o2: Orientation = { iw: item.h + kerf, ih: item.w + kerf, rotated: true };
    return [o1, o2];
  }
  return [o1];
}

function scoreFit(fit: FitRule, free: Rect, o: Orientation): [number, number] {
  const remW = free.w - o.iw;
  const remH = free.h - o.ih;
  switch (fit) {
    case 'bssf':
      return [Math.min(remW, remH), Math.max(remW, remH)];
    case 'blsf':
      return [Math.max(remW, remH), Math.min(remW, remH)];
    case 'baf':
      return [free.w * free.h - o.iw * o.ih, Math.min(remW, remH)];
  }
}

export function fillGuillotine<T extends SheetItem>(
  order: T[],
  W: Length,
  H: Length,
  kerf: Length,
  edgeTrim: Length,
  fit: FitRule,
  split: SplitRule,
): SingleSheetResult<T> {
  const free: Rect[] = [{ x: 0, y: 0, w: W, h: H }];
  const placed: Placement<T>[] = [];
  const rest: T[] = [];
  const cuts: Cut[] = [];

  for (const item of order) {
    let bestFreeIndex = -1;
    let bestOrientation: Orientation | null = null;
    let bestScore: [number, number] | null = null;

    const orientations = getOrientations(item, kerf);

    for (let fIdx = 0; fIdx < free.length; fIdx++) {
      const f = free[fIdx]!;
      for (const o of orientations) {
        if (o.iw <= f.w && o.ih <= f.h) {
          const score = scoreFit(fit, f, o);
          if (
            bestScore === null ||
            score[0] < bestScore[0] ||
            (score[0] === bestScore[0] && score[1] < bestScore[1]) ||
            (score[0] === bestScore[0] &&
              score[1] === bestScore[1] &&
              f.y < free[bestFreeIndex]!.y) ||
            (score[0] === bestScore[0] &&
              score[1] === bestScore[1] &&
              f.y === free[bestFreeIndex]!.y &&
              f.x < free[bestFreeIndex]!.x)
          ) {
            bestScore = score;
            bestFreeIndex = fIdx;
            bestOrientation = o;
          }
        }
      }
    }

    if (bestFreeIndex === -1 || !bestOrientation) {
      rest.push(item);
      continue;
    }

    const chosenFree = free.splice(bestFreeIndex, 1)[0]!;
    const o = bestOrientation;

    const realX = edgeTrim + chosenFree.x;
    const realY = edgeTrim + chosenFree.y;
    const realW = o.rotated ? item.h : item.w;
    const realH = o.rotated ? item.w : item.h;

    placed.push({
      item,
      x: realX,
      y: realY,
      w: realW,
      h: realH,
      rotated: o.rotated,
    });

    const lx = chosenFree.w - o.iw;
    const ly = chosenFree.h - o.ih;

    let useSplitA: boolean;
    switch (split) {
      case 'rip-first':
        useSplitA = true;
        break;
      case 'cross-first':
        useSplitA = false;
        break;
      case 'shorter-leftover':
        useSplitA = lx <= ly;
        break;
      case 'longer-leftover':
        useSplitA = lx > ly;
        break;
      case 'max-area': {
        const maxAreaA = Math.max(chosenFree.w * ly, lx * o.ih);
        const maxAreaB = Math.max(lx * chosenFree.h, o.iw * ly);
        useSplitA = maxAreaA >= maxAreaB;
        break;
      }
    }

    if (useSplitA) {
      // Split A: Rip cut first at chosenFree.y + o.ih, spanning chosenFree.w
      if (ly > 0) {
        const cutN = cuts.length + 1;
        cuts.push({
          n: cutN,
          rip: true,
          x: edgeTrim + chosenFree.x,
          y: edgeTrim + chosenFree.y + o.ih - kerf,
          span: chosenFree.w - kerf,
          piece: {
            x: edgeTrim + chosenFree.x,
            y: edgeTrim + chosenFree.y,
            w: chosenFree.w - kerf,
            h: chosenFree.h - kerf,
          },
          at: o.ih - kerf,
        });
      }
      if (lx > 0) {
        const cutN = cuts.length + 1;
        cuts.push({
          n: cutN,
          rip: false,
          x: edgeTrim + chosenFree.x + o.iw - kerf,
          y: edgeTrim + chosenFree.y,
          span: o.ih - kerf,
          piece: {
            x: edgeTrim + chosenFree.x,
            y: edgeTrim + chosenFree.y,
            w: chosenFree.w - kerf,
            h: o.ih - kerf,
          },
          at: o.iw - kerf,
        });
      }
      if (ly > 0) {
        free.push({ x: chosenFree.x, y: chosenFree.y + o.ih, w: chosenFree.w, h: ly });
      }
      if (lx > 0) {
        free.push({ x: chosenFree.x + o.iw, y: chosenFree.y, w: lx, h: o.ih });
      }
    } else {
      // Split B: Crosscut first at chosenFree.x + o.iw, spanning chosenFree.h
      if (lx > 0) {
        const cutN = cuts.length + 1;
        cuts.push({
          n: cutN,
          rip: false,
          x: edgeTrim + chosenFree.x + o.iw - kerf,
          y: edgeTrim + chosenFree.y,
          span: chosenFree.h - kerf,
          piece: {
            x: edgeTrim + chosenFree.x,
            y: edgeTrim + chosenFree.y,
            w: chosenFree.w - kerf,
            h: chosenFree.h - kerf,
          },
          at: o.iw - kerf,
        });
      }
      if (ly > 0) {
        const cutN = cuts.length + 1;
        cuts.push({
          n: cutN,
          rip: true,
          x: edgeTrim + chosenFree.x,
          y: edgeTrim + chosenFree.y + o.ih - kerf,
          span: o.iw - kerf,
          piece: {
            x: edgeTrim + chosenFree.x,
            y: edgeTrim + chosenFree.y,
            w: o.iw - kerf,
            h: chosenFree.h - kerf,
          },
          at: o.ih - kerf,
        });
      }
      if (lx > 0) {
        free.push({ x: chosenFree.x + o.iw, y: chosenFree.y, w: lx, h: chosenFree.h });
      }
      if (ly > 0) {
        free.push({ x: chosenFree.x, y: chosenFree.y + o.ih, w: o.iw, h: ly });
      }
    }
  }

  return { placed, rest, cuts, free };
}
