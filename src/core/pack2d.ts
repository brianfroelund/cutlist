import type { Area, Length, Material, StockItem } from './model';
import { fillGuillotine, type FitRule, type SingleSheetResult, type SplitRule } from './guillotine';
import { fillMaxRects, type MaxRectsFitRule, type MaxRectsResult } from './maxrects';
import { compareScores, Inventory, jitter, seededRandom } from './pack';
import type {
  Pack2DOptions,
  Pack2DResult,
  Placement,
  SheetItem,
  SheetLayout,
} from './pack2d-types';
import { area, type Rect } from './rect';

export * from './pack2d-types';

export function expandSheetParts(material: Material): SheetItem[] {
  return material.parts.flatMap((part) => {
    if (part.length <= 0 || part.width <= 0) return [];
    let w = part.length;
    let h = part.width;
    let rotatable = !material.grain;

    if (material.grain) {
      if (part.grain === 'length') {
        w = part.length;
        h = part.width;
        rotatable = false;
      } else if (part.grain === 'width') {
        w = part.width;
        h = part.length;
        rotatable = false;
      } else {
        w = part.length;
        h = part.width;
        rotatable = true;
      }
    }

    return Array.from({ length: Math.max(0, Math.floor(part.quantity)) }, (_, i) => ({
      id: `${part.id}#${i}`,
      ref: part.id,
      label: part.label.trim(),
      w,
      h,
      rotatable,
    }));
  });
}

type SortKey = 'area' | 'longSide' | 'shortSide' | 'perimeter';

function sortItems<T extends SheetItem>(items: T[], key: SortKey): T[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    let diff = 0;
    switch (key) {
      case 'area':
        diff = b.w * b.h - a.w * a.h;
        break;
      case 'longSide':
        diff = Math.max(b.w, b.h) - Math.max(a.w, a.h);
        break;
      case 'shortSide':
        diff = Math.min(b.w, b.h) - Math.min(a.w, a.h);
        break;
      case 'perimeter':
        diff = b.w + b.h - (a.w + a.h);
        break;
    }
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });
  return sorted;
}

function findLargestOffcut(free: Rect[], kerf: Length, edgeTrim: Length): Rect | null {
  let best: Rect | null = null;
  let maxA = 0;
  for (const f of free) {
    const rw = f.w - kerf;
    const rh = f.h - kerf;
    if (rw > 0 && rh > 0) {
      const a = rw * rh;
      if (a > maxA) {
        maxA = a;
        best = {
          x: edgeTrim + f.x,
          y: edgeTrim + f.y,
          w: rw,
          h: rh,
        };
      }
    }
  }
  return best;
}

function sortPlacements<T extends SheetItem>(placements: Placement<T>[]): Placement<T>[] {
  return [...placements].sort((a, b) => a.y - b.y || a.x - b.x);
}

function packSheetsOnce<T extends SheetItem>(
  order: T[],
  stock: StockItem[],
  opts: Pack2DOptions,
  fillFn: (items: T[], W: Length, H: Length) => SingleSheetResult<T> | MaxRectsResult<T>,
  random: (() => number) | null,
): Pack2DResult<T> {
  const inventory = new Inventory(stock);
  const sheets: SheetLayout<T>[] = [];
  let remaining = order;
  const kerf = opts.kerf;
  const edgeTrim = opts.edgeTrim;

  while (remaining.length > 0) {
    const options: {
      stock: StockItem;
      result: SingleSheetResult<T> | MaxRectsResult<T>;
      ratio: number;
    }[] = [];

    for (const s of stock) {
      if (!inventory.has(s)) continue;
      const W = s.length - 2 * edgeTrim + kerf;
      const H = s.width - 2 * edgeTrim + kerf;
      if (W <= kerf || H <= kerf) continue;

      const res = fillFn(remaining, W, H);
      if (res.placed.length > 0) {
        const partArea = res.placed.reduce((sum, p) => sum + p.w * p.h, 0);
        const ratio = partArea / (s.length * s.width);
        options.push({ stock: s, result: res, ratio });
      }
    }

    if (options.length === 0) break;

    options.sort((a, b) => {
      const diff = b.ratio - a.ratio;
      if (Math.abs(diff) > 1e-6) return diff;
      const areaDiff = b.stock.length * b.stock.width - a.stock.length * a.stock.width;
      if (areaDiff !== 0) return areaDiff;
      return 0;
    });

    const top = options[0]!;
    const close = random ? options.filter((o) => o.ratio >= top.ratio - 0.04) : [top];
    const pick = close[Math.floor((random?.() ?? 0) * close.length)]!;

    inventory.take(pick.stock);

    const partArea = pick.result.placed.reduce((sum, p) => sum + p.w * p.h, 0);
    const cuts = 'cuts' in pick.result ? pick.result.cuts : [];
    const largestOffcut = findLargestOffcut(pick.result.free, kerf, edgeTrim);

    sheets.push({
      stockId: pick.stock.id,
      length: pick.stock.length,
      width: pick.stock.width,
      edgeTrim,
      placements: sortPlacements(pick.result.placed),
      cuts,
      largestOffcut,
      partArea,
    });

    remaining = pick.result.rest;
  }

  return { sheets, unplaced: remaining };
}

export function scorePack2D(result: Pack2DResult): number[] {
  let totalSheetArea: Area = 0;
  let largestOffcutArea: Area = 0;
  let totalCuts = 0;

  for (const sheet of result.sheets) {
    totalSheetArea += sheet.length * sheet.width;
    if (sheet.largestOffcut) {
      const a = area(sheet.largestOffcut);
      if (a > largestOffcutArea) largestOffcutArea = a;
    }
    totalCuts += sheet.cuts.length;
  }

  return [
    result.unplaced.length,
    totalSheetArea,
    result.sheets.length,
    -largestOffcutArea,
    totalCuts,
  ];
}

export function pack2d<T extends SheetItem>(
  items: T[],
  stock: StockItem[],
  options: Pack2DOptions,
): Pack2DResult<T> {
  const kerf = options.kerf;
  const edgeTrim = options.edgeTrim;
  const style = options.style;
  const validStock = stock.filter(
    (s) => s.length > 0 && s.width > 0 && (s.quantity === null || s.quantity > 0),
  );

  if (items.length === 0 || validStock.length === 0) {
    return { sheets: [], unplaced: items };
  }

  const sortKeys: SortKey[] = ['area', 'longSide', 'shortSide', 'perimeter'];
  const guillotineFitRules: FitRule[] = ['bssf', 'blsf', 'baf'];
  const guillotineSplitRules: SplitRule[] = [
    'shorter-leftover',
    'longer-leftover',
    'max-area',
    'rip-first',
    'cross-first',
  ];
  const maxRectsFitRules: MaxRectsFitRule[] = ['bssf', 'blsf', 'baf', 'bl', 'contact'];

  const results: Pack2DResult<T>[] = [];

  if (style === 'guillotine') {
    for (const sKey of sortKeys) {
      const sorted = sortItems(items, sKey);
      for (const fit of guillotineFitRules) {
        for (const split of guillotineSplitRules) {
          results.push(
            packSheetsOnce(
              sorted,
              validStock,
              options,
              (rem, W, H) => fillGuillotine(rem, W, H, kerf, edgeTrim, fit, split),
              null,
            ),
          );
        }
      }
    }
  } else {
    for (const sKey of sortKeys) {
      const sorted = sortItems(items, sKey);
      for (const fit of maxRectsFitRules) {
        results.push(
          packSheetsOnce(
            sorted,
            validStock,
            options,
            (rem, W, H) => fillMaxRects(rem, W, H, kerf, edgeTrim, fit),
            null,
          ),
        );
      }
    }
  }

  const attempts = options.attempts ?? 16;
  const rng = seededRandom(options.seed ?? 1);

  for (let i = 0; i < attempts; i++) {
    const sKey = sortKeys[Math.floor(rng() * sortKeys.length)]!;
    const sorted = sortItems(items, sKey);
    const order = jitter(sorted, rng);

    if (style === 'guillotine') {
      const fit = guillotineFitRules[Math.floor(rng() * guillotineFitRules.length)]!;
      const split = guillotineSplitRules[Math.floor(rng() * guillotineSplitRules.length)]!;
      results.push(
        packSheetsOnce(
          order,
          validStock,
          options,
          (rem, W, H) => fillGuillotine(rem, W, H, kerf, edgeTrim, fit, split),
          rng,
        ),
      );
    } else {
      const fit = maxRectsFitRules[Math.floor(rng() * maxRectsFitRules.length)]!;
      results.push(
        packSheetsOnce(
          order,
          validStock,
          options,
          (rem, W, H) => fillMaxRects(rem, W, H, kerf, edgeTrim, fit),
          rng,
        ),
      );
    }
  }

  const scored = results.map((r) => ({ r, score: scorePack2D(r) }));
  scored.sort((a, b) => compareScores(a.score, b.score));
  return scored[0]!.r;
}
