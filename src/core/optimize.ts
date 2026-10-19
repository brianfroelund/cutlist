import type { Area, Length, Material, Project } from './model';
import {
  compareScores,
  pack,
  scorePack,
  type Bin,
  type PackItem,
  type PackOptions,
  type PackResult,
} from './pack';
import {
  expandSheetParts,
  pack2d,
  type Pack2DOptions,
  type SheetItem,
  type SheetLayout,
} from './pack2d';
import { blankSets, isBlank, type Blank } from './planing';
import type { Rect } from './rect';

export type UnplacedReason = 'too-long' | 'out-of-stock' | 'no-stock' | 'too-large' | 'grain';

export interface Unplaced {
  ref: string;
  label: string;
  length: Length;
  count: number;
  reason: UnplacedReason;
  width?: Length;
}

export interface StockUse {
  stockId: string;
  length: Length;
  count: number;
}

export interface SheetUse {
  stockId: string;
  length: Length;
  width: Length;
  count: number;
}

export interface Stats {
  boards: number;
  stockLength: Length;
  partLength: Length;
  /** Stock length not ending up in a part: kerfs, trims and offcuts. */
  waste: Length;
  wastePct: number;
  largestOffcut: Length;
}

export interface SheetStats {
  sheets: number;
  stockArea: Area;
  partArea: Area;
  waste: Area;
  wastePct: number;
  largestOffcut: Rect | null;
}

export interface MaterialResult {
  kind: 'linear';
  materialId: string;
  name: string;
  boards: Bin<PackItem | Blank>[];
  /** Set when the material uses the planing workflow. */
  blanks: Blank[] | null;
  unplaced: Unplaced[];
  shopping: StockUse[];
  stats: Stats;
}

export interface SheetMaterialResult {
  kind: 'sheet';
  materialId: string;
  name: string;
  sheets: SheetLayout[];
  unplaced: Unplaced[];
  shopping: SheetUse[];
  stats: SheetStats;
}

export type AnyMaterialResult = MaterialResult | SheetMaterialResult;

export interface Totals {
  linear: Stats | null;
  sheet: SheetStats | null;
  pieces: number;
  wastePct: number;
}

export interface OptimizeResult {
  materials: AnyMaterialResult[];
  totals: Totals;
}

export const DEFAULT_OPTIONS: PackOptions = { attempts: 16, seed: 1 };

export function expandParts(material: Material): PackItem[] {
  return material.parts.flatMap((part) =>
    part.length > 0
      ? Array.from({ length: Math.max(0, Math.floor(part.quantity)) }, (_, i) => ({
          id: `${part.id}#${i}`,
          ref: part.id,
          label: part.label.trim(),
          length: part.length,
        }))
      : [],
  );
}

const partLengthOf = (item: PackItem): Length =>
  isBlank(item) ? item.parts.reduce((sum, p) => sum + p.item.length, 0) : item.length;

/** Like scorePack, but before the offcut tie-break prefer fewer (so longer) rough-cut blanks. */
function planingScore(result: PackResult<Blank>): number[] {
  const [unplaced, stockLength, boards, offcut] = scorePack(result) as [
    number,
    number,
    number,
    number,
  ];
  const blanks = result.bins.reduce((sum, b) => sum + b.items.length, 0);
  return [unplaced, stockLength, boards, blanks, offcut];
}

function groupUnplaced(entries: { item: PackItem; reason: UnplacedReason }[]): Unplaced[] {
  const groups = new Map<string, Unplaced>();
  for (const { item, reason } of entries) {
    const key = `${item.ref}:${reason}`;
    const existing = groups.get(key);
    if (existing) existing.count++;
    else
      groups.set(key, { ref: item.ref, label: item.label, length: item.length, count: 1, reason });
  }
  return [...groups.values()];
}

function groupSheetUnplaced(
  entries: { item: SheetItem; reason: UnplacedReason }[],
  material: Material,
): Unplaced[] {
  const groups = new Map<string, Unplaced>();
  for (const { item, reason } of entries) {
    const key = `${item.ref}:${reason}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count++;
    } else {
      const sourcePart = material.parts.find((p) => p.id === item.ref);
      groups.set(key, {
        ref: item.ref,
        label: item.label,
        length: sourcePart ? sourcePart.length : item.w,
        width: sourcePart ? sourcePart.width : item.h,
        count: 1,
        reason,
      });
    }
  }
  return [...groups.values()];
}

export function optimizeMaterial(
  material: Material,
  kerf: Length,
  options: PackOptions = DEFAULT_OPTIONS,
): MaterialResult {
  const parts = expandParts(material);
  const stock = material.stock.filter(
    (s) => s.length > 0 && (s.quantity === null || s.quantity > 0),
  );
  const longest = stock.reduce((max, s) => Math.max(max, s.length), 0);
  const reasonFor = (length: Length): UnplacedReason =>
    stock.length === 0 ? 'no-stock' : length > longest ? 'too-long' : 'out-of-stock';

  let boards: Bin<PackItem | Blank>[];
  let blanks: Blank[] | null = null;
  let missing: { item: PackItem; reason: UnplacedReason }[];

  if (material.planingLength !== null && parts.length > 0) {
    let best: PackResult<Blank> | null = null;
    for (const set of blankSets(
      parts,
      material.planingLength,
      material.trimPerEnd,
      kerf,
      options,
    )) {
      const result = pack(set, stock, kerf, options);
      if (!best || compareScores(planingScore(result), planingScore(best)) < 0) best = result;
    }
    const chosen = best!;
    // Identical blanks share a label so repeated boards and blanks can be listed once.
    const labels = new Map<string, string>();
    const label = (blank: Blank) => {
      const key = `${blank.length}|${blank.parts.map((p) => `${p.item.ref}:${p.item.length}`).join(',')}`;
      if (!labels.has(key)) labels.set(key, `B${labels.size + 1}`);
      blank.label = labels.get(key)!;
    };
    for (const bin of chosen.bins) for (const placed of bin.items) label(placed.item);
    for (const blank of chosen.unplaced) label(blank);
    boards = chosen.bins;
    blanks = chosen.bins.flatMap((b) => b.items.map((p) => p.item));
    missing = chosen.unplaced.flatMap((blank) =>
      blank.parts.map((p) => ({ item: p.item, reason: reasonFor(blank.length) })),
    );
  } else {
    const result = pack(parts, stock, kerf, options);
    boards = result.bins;
    missing = result.unplaced.map((item) => ({ item, reason: reasonFor(item.length) }));
  }

  const shopping = new Map<string, StockUse>();
  for (const bin of boards) {
    const use = shopping.get(bin.stockId);
    if (use) use.count++;
    else shopping.set(bin.stockId, { stockId: bin.stockId, length: bin.stockLength, count: 1 });
  }

  const stockLength = boards.reduce((sum, b) => sum + b.stockLength, 0);
  const partLength = boards.reduce(
    (sum, b) => sum + b.items.reduce((s, p) => s + partLengthOf(p.item), 0),
    0,
  );

  return {
    kind: 'linear',
    materialId: material.id,
    name: material.name,
    boards,
    blanks,
    unplaced: groupUnplaced(missing),
    shopping: [...shopping.values()].sort((a, b) => b.length - a.length),
    stats: makeStats({
      boards: boards.length,
      stockLength,
      partLength,
      largestOffcut: boards.reduce((max, b) => Math.max(max, b.offcut), 0),
    }),
  };
}

function makeStats(s: Omit<Stats, 'waste' | 'wastePct'>): Stats {
  const waste = s.stockLength - s.partLength;
  const wastePct = s.stockLength > 0 ? Math.round((waste / s.stockLength) * 1000) / 10 : 0;
  return { ...s, waste, wastePct };
}

export function optimizeSheetMaterial(
  material: Material,
  kerf: Length,
  options: PackOptions = DEFAULT_OPTIONS,
): SheetMaterialResult {
  const items = expandSheetParts(material);
  const validStock = material.stock.filter(
    (s) => s.length > 0 && s.width > 0 && (s.quantity === null || s.quantity > 0),
  );

  const packOpts: Pack2DOptions = {
    attempts: options.attempts ?? 16,
    seed: options.seed ?? 1,
    style: material.cutStyle,
    kerf,
    edgeTrim: material.edgeTrim,
  };

  const result = pack2d(items, validStock, packOpts);

  const reasonFor = (item: SheetItem): UnplacedReason => {
    if (validStock.length === 0) return 'no-stock';
    let fitsUnrotated = false;
    let fitsRotated = false;
    for (const s of validStock) {
      const usableW = s.length - 2 * material.edgeTrim;
      const usableH = s.width - 2 * material.edgeTrim;
      if (item.w <= usableW && item.h <= usableH) fitsUnrotated = true;
      if (item.h <= usableW && item.w <= usableH) fitsRotated = true;
    }
    if (item.rotatable) {
      if (!fitsUnrotated && !fitsRotated) return 'too-large';
    } else {
      if (!fitsUnrotated) {
        return fitsRotated ? 'grain' : 'too-large';
      }
    }
    return 'out-of-stock';
  };

  const missing = result.unplaced.map((item) => ({ item, reason: reasonFor(item) }));

  const shopping = new Map<string, SheetUse>();
  for (const sheet of result.sheets) {
    const use = shopping.get(sheet.stockId);
    if (use) {
      use.count++;
    } else {
      shopping.set(sheet.stockId, {
        stockId: sheet.stockId,
        length: sheet.length,
        width: sheet.width,
        count: 1,
      });
    }
  }

  const stockArea = result.sheets.reduce((sum, s) => sum + s.length * s.width, 0);
  const partArea = result.sheets.reduce((sum, s) => sum + s.partArea, 0);
  const waste = stockArea - partArea;
  const wastePct = stockArea > 0 ? Math.round((waste / stockArea) * 1000) / 10 : 0;

  let largestOffcut: Rect | null = null;
  let maxOffcutA = 0;
  for (const s of result.sheets) {
    if (s.largestOffcut) {
      const a = s.largestOffcut.w * s.largestOffcut.h;
      if (a > maxOffcutA) {
        maxOffcutA = a;
        largestOffcut = s.largestOffcut;
      }
    }
  }

  return {
    kind: 'sheet',
    materialId: material.id,
    name: material.name,
    sheets: result.sheets,
    unplaced: groupSheetUnplaced(missing, material),
    shopping: [...shopping.values()].sort((a, b) => b.length * b.width - a.length * a.width),
    stats: {
      sheets: result.sheets.length,
      stockArea,
      partArea,
      waste,
      wastePct,
      largestOffcut,
    },
  };
}

export function optimize(project: Project, options: PackOptions = DEFAULT_OPTIONS): OptimizeResult {
  const materials: AnyMaterialResult[] = project.materials.map((m) =>
    m.kind === 'sheet'
      ? optimizeSheetMaterial(m, project.kerf, options)
      : optimizeMaterial(m, project.kerf, options),
  );

  const linearMaterials = materials.filter((m): m is MaterialResult => m.kind === 'linear');
  const sheetMaterials = materials.filter((m): m is SheetMaterialResult => m.kind === 'sheet');

  let linearTotals: Stats | null = null;
  if (linearMaterials.length > 0) {
    const stockLength = linearMaterials.reduce((sum, m) => sum + m.stats.stockLength, 0);
    const partLength = linearMaterials.reduce((sum, m) => sum + m.stats.partLength, 0);
    linearTotals = makeStats({
      boards: linearMaterials.reduce((sum, m) => sum + m.stats.boards, 0),
      stockLength,
      partLength,
      largestOffcut: linearMaterials.reduce((max, m) => Math.max(max, m.stats.largestOffcut), 0),
    });
  }

  let sheetTotals: SheetStats | null = null;
  if (sheetMaterials.length > 0) {
    const stockArea = sheetMaterials.reduce((sum, m) => sum + m.stats.stockArea, 0);
    const partArea = sheetMaterials.reduce((sum, m) => sum + m.stats.partArea, 0);
    const waste = stockArea - partArea;
    const wastePct = stockArea > 0 ? Math.round((waste / stockArea) * 1000) / 10 : 0;
    let largestOffcut: Rect | null = null;
    let maxOffcutA = 0;
    for (const m of sheetMaterials) {
      if (m.stats.largestOffcut) {
        const a = m.stats.largestOffcut.w * m.stats.largestOffcut.h;
        if (a > maxOffcutA) {
          maxOffcutA = a;
          largestOffcut = m.stats.largestOffcut;
        }
      }
    }
    sheetTotals = {
      sheets: sheetMaterials.reduce((sum, m) => sum + m.stats.sheets, 0),
      stockArea,
      partArea,
      waste,
      wastePct,
      largestOffcut,
    };
  }

  const pieces = (linearTotals ? linearTotals.boards : 0) + (sheetTotals ? sheetTotals.sheets : 0);

  const wastes: number[] = [];
  if (linearTotals && linearTotals.boards > 0) wastes.push(linearTotals.wastePct);
  if (sheetTotals && sheetTotals.sheets > 0) wastes.push(sheetTotals.wastePct);
  const wastePct = wastes.length > 0 ? Math.max(...wastes) : 0;

  return {
    materials,
    totals: {
      linear: linearTotals,
      sheet: sheetTotals,
      pieces,
      wastePct,
    },
  };
}
