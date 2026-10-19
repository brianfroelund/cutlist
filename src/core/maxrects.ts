import type { Length } from './model';
import type { Placement, SheetItem } from './pack2d-types';
import { contains, overlaps, type Rect } from './rect';

export type MaxRectsFitRule = 'bssf' | 'blsf' | 'baf' | 'bl' | 'contact';

interface Orientation {
  iw: Length;
  ih: Length;
  rotated: boolean;
}

export interface MaxRectsResult<T extends SheetItem = SheetItem> {
  placed: Placement<T>[];
  rest: T[];
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

function contactScore(node: Rect, W: Length, H: Length, placedNodes: Rect[]): number {
  let score = 0;
  if (node.x === 0 || node.x + node.w === W) score += node.h;
  if (node.y === 0 || node.y + node.h === H) score += node.w;
  for (const p of placedNodes) {
    if (node.x === p.x + p.w || node.x + node.w === p.x) {
      const top = Math.max(node.y, p.y);
      const bottom = Math.min(node.y + node.h, p.y + p.h);
      if (bottom > top) score += bottom - top;
    }
    if (node.y === p.y + p.h || node.y + node.h === p.y) {
      const left = Math.max(node.x, p.x);
      const right = Math.min(node.x + node.w, p.x + p.w);
      if (right > left) score += right - left;
    }
  }
  return score;
}

function scoreFit(
  fit: MaxRectsFitRule,
  f: Rect,
  o: Orientation,
  W: Length,
  H: Length,
  placedNodes: Rect[],
): [number, number] {
  const remW = f.w - o.iw;
  const remH = f.h - o.ih;
  switch (fit) {
    case 'bssf':
      return [Math.min(remW, remH), Math.max(remW, remH)];
    case 'blsf':
      return [Math.max(remW, remH), Math.min(remW, remH)];
    case 'baf':
      return [f.w * f.h - o.iw * o.ih, Math.min(remW, remH)];
    case 'bl':
      return [f.y + o.ih, f.x];
    case 'contact': {
      const node: Rect = { x: f.x, y: f.y, w: o.iw, h: o.ih };
      const contact = contactScore(node, W, H, placedNodes);
      return [-contact, Math.min(remW, remH)];
    }
  }
}

function pruneFree(free: Rect[]): Rect[] {
  const out: Rect[] = [];
  for (let i = 0; i < free.length; i++) {
    const a = free[i]!;
    let isContained = false;
    for (let j = 0; j < free.length; j++) {
      if (i === j) continue;
      const b = free[j]!;
      if (contains(b, a)) {
        if (a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h) {
          if (i > j) {
            isContained = true;
            break;
          }
        } else {
          isContained = true;
          break;
        }
      }
    }
    if (!isContained) out.push(a);
  }
  return out;
}

export function fillMaxRects<T extends SheetItem>(
  order: T[],
  W: Length,
  H: Length,
  kerf: Length,
  edgeTrim: Length,
  fit: MaxRectsFitRule,
): MaxRectsResult<T> {
  let free: Rect[] = [{ x: 0, y: 0, w: W, h: H }];
  const placed: Placement<T>[] = [];
  const placedNodes: Rect[] = [];
  const rest: T[] = [];

  for (const item of order) {
    let bestFree: Rect | null = null;
    let bestOrientation: Orientation | null = null;
    let bestScore: [number, number] | null = null;

    const orientations = getOrientations(item, kerf);

    for (const f of free) {
      for (const o of orientations) {
        if (o.iw <= f.w && o.ih <= f.h) {
          const score = scoreFit(fit, f, o, W, H, placedNodes);
          if (
            bestScore === null ||
            score[0] < bestScore[0] ||
            (score[0] === bestScore[0] && score[1] < bestScore[1]) ||
            (score[0] === bestScore[0] &&
              score[1] === bestScore[1] &&
              (f.y < bestFree!.y || (f.y === bestFree!.y && f.x < bestFree!.x)))
          ) {
            bestScore = score;
            bestFree = f;
            bestOrientation = o;
          }
        }
      }
    }

    if (!bestFree || !bestOrientation) {
      rest.push(item);
      continue;
    }

    const o = bestOrientation;
    const node: Rect = { x: bestFree.x, y: bestFree.y, w: o.iw, h: o.ih };
    placedNodes.push(node);

    const realX = edgeTrim + node.x;
    const realY = edgeTrim + node.y;
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

    const newFree: Rect[] = [];
    for (const r of free) {
      if (!overlaps(r, node)) {
        newFree.push(r);
        continue;
      }
      if (node.x > r.x) {
        newFree.push({ x: r.x, y: r.y, w: node.x - r.x, h: r.h });
      }
      if (node.x + node.w < r.x + r.w) {
        newFree.push({
          x: node.x + node.w,
          y: r.y,
          w: r.x + r.w - (node.x + node.w),
          h: r.h,
        });
      }
      if (node.y > r.y) {
        newFree.push({ x: r.x, y: r.y, w: r.w, h: node.y - r.y });
      }
      if (node.y + node.h < r.y + r.h) {
        newFree.push({
          x: r.x,
          y: node.y + node.h,
          w: r.w,
          h: r.y + r.h - (node.y + node.h),
        });
      }
    }
    free = pruneFree(newFree);
  }

  return { placed, rest, free };
}
