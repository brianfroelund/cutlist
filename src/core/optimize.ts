import type { Length, Material, Project } from './model';
import {
  compareScores,
  pack,
  scorePack,
  type Bin,
  type PackItem,
  type PackOptions,
  type PackResult,
} from './pack';
import { blankSets, isBlank, type Blank } from './planing';

export type UnplacedReason = 'too-long' | 'out-of-stock' | 'no-stock';

export interface Unplaced {
  ref: string;
  label: string;
  length: Length;
  count: number;
  reason: UnplacedReason;
}

export interface StockUse {
  stockId: string;
  length: Length;
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

export interface MaterialResult {
  materialId: string;
  name: string;
  boards: Bin<PackItem | Blank>[];
  /** Set when the material uses the planing workflow. */
  blanks: Blank[] | null;
  unplaced: Unplaced[];
  shopping: StockUse[];
  stats: Stats;
}

export interface OptimizeResult {
  materials: MaterialResult[];
  totals: Stats;
}

export const DEFAULT_OPTIONS: PackOptions = { attempts: 16, seed: 1 };

export function expandParts(material: Material): PackItem[] {
  return material.parts.flatMap((part) =>
    part.length > 0
      ? Array.from({ length: Math.max(0, Math.floor(part.quantity)) }, (_, i) => ({
          id: `${part.id}#${i}`,
          ref: part.id,
          label: part.label.trim() || 'Part',
          length: part.length,
        }))
      : [],
  );
}

const partLengthOf = (item: PackItem): Length =>
  isBlank(item) ? item.parts.reduce((sum, p) => sum + p.item.length, 0) : item.length;

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
      if (!best || compareScores(scorePack(result), scorePack(best)) < 0) best = result;
    }
    const chosen = best!;
    let n = 0;
    for (const bin of chosen.bins) for (const placed of bin.items) placed.item.label = `B${++n}`;
    for (const blank of chosen.unplaced) blank.label = `B${++n}`;
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

export function optimize(project: Project, options: PackOptions = DEFAULT_OPTIONS): OptimizeResult {
  const materials = project.materials.map((m) => optimizeMaterial(m, project.kerf, options));
  return {
    materials,
    totals: makeStats({
      boards: materials.reduce((sum, m) => sum + m.stats.boards, 0),
      stockLength: materials.reduce((sum, m) => sum + m.stats.stockLength, 0),
      partLength: materials.reduce((sum, m) => sum + m.stats.partLength, 0),
      largestOffcut: materials.reduce((max, m) => Math.max(max, m.stats.largestOffcut), 0),
    }),
  };
}
