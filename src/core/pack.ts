import type { Length, StockItem } from './model';

export interface PackItem {
  id: string;
  /** Id of the source part (or blank); shared by every copy. */
  ref: string;
  label: string;
  length: Length;
}

export interface Placed<T extends PackItem = PackItem> {
  item: T;
  offset: Length;
}

export interface Bin<T extends PackItem = PackItem> {
  stockId: string;
  stockLength: Length;
  items: Placed<T>[];
  /** Parts plus every kerf, measured from the board start. */
  used: Length;
  /** Leftover at the end of the board. */
  offcut: Length;
}

export interface PackResult<T extends PackItem = PackItem> {
  bins: Bin<T>[];
  unplaced: T[];
}

export interface PackOptions {
  attempts?: number;
  seed?: number;
}

type Random = () => number;

interface OpenBin<T> {
  stock: StockItem;
  items: T[];
  load: Length;
}

interface Group<T> {
  size: Length;
  items: T[];
}

const SUBSET_NODE_LIMIT = 4000;

export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Inventory {
  private left = new Map<string, number>();

  constructor(stock: StockItem[]) {
    for (const s of stock) this.left.set(s.id, s.quantity ?? Infinity);
  }

  has(stock: StockItem): boolean {
    return (this.left.get(stock.id) ?? 0) > 0;
  }

  take(stock: StockItem): void {
    this.left.set(stock.id, (this.left.get(stock.id) ?? 0) - 1);
  }

  give(stock: StockItem): void {
    this.left.set(stock.id, (this.left.get(stock.id) ?? 0) + 1);
  }
}

// Each piece costs length + kerf; a board fits n pieces when Σ(len + kerf) ≤ board + kerf.
const capacity = (stock: StockItem, kerf: Length) => stock.length + kerf;

function closeBin<T extends PackItem>(bin: OpenBin<T>, kerf: Length): Bin<T> {
  const items = [...bin.items].sort((a, b) => b.length - a.length);
  const placed: Placed<T>[] = [];
  let offset = 0;
  for (const item of items) {
    placed.push({ item, offset });
    offset += item.length + kerf;
  }
  const span = offset - kerf;
  const length = bin.stock.length;
  const used = span < length ? Math.min(length, span + kerf) : span;
  return { stockId: bin.stock.id, stockLength: length, items: placed, used, offcut: length - used };
}

function groupBySize<T extends PackItem>(items: T[], kerf: Length): Group<T>[] {
  const byLength = new Map<Length, T[]>();
  for (const item of items) {
    const list = byLength.get(item.length);
    if (list) list.push(item);
    else byLength.set(item.length, [item]);
  }
  return [...byLength.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([length, list]) => ({ size: length + kerf, items: list }));
}

/** Bounded branch-and-bound subset sum: the fullest selection that fits `cap`. */
function bestSubset<T>(groups: Group<T>[], cap: Length): T[] {
  const n = groups.length;
  const suffix = new Array<number>(n + 1).fill(0);
  for (let i = n - 1; i >= 0; i--)
    suffix[i] = suffix[i + 1]! + groups[i]!.size * groups[i]!.items.length;
  const take = new Array<number>(n).fill(0);
  let best = 0;
  let bestTake = take.slice();
  let nodes = 0;

  const visit = (i: number, load: number): void => {
    if (load > best) {
      best = load;
      bestTake = take.slice();
    }
    if (best === cap || i === n || nodes++ > SUBSET_NODE_LIMIT) return;
    if (load + suffix[i]! <= best) return;
    const group = groups[i]!;
    const max = Math.min(group.items.length, Math.floor((cap - load) / group.size));
    for (let k = max; k >= 0; k--) {
      take[i] = k;
      visit(i + 1, load + k * group.size);
      if (best === cap || nodes > SUBSET_NODE_LIMIT) break;
    }
    take[i] = 0;
  };

  visit(0, 0);
  return groups.flatMap((g, i) => g.items.slice(0, bestTake[i]));
}

/** Opens one board at a time, choosing the stock length that can be filled most completely. */
function bestFill<T extends PackItem>(
  items: T[],
  stock: StockItem[],
  kerf: Length,
  random: Random | null,
): PackResult<T> {
  const inventory = new Inventory(stock);
  const bins: OpenBin<T>[] = [];
  let remaining = items;
  while (remaining.length > 0) {
    const groups = groupBySize(remaining, kerf);
    const options: { stock: StockItem; items: T[]; ratio: number }[] = [];
    for (const s of stock) {
      if (!inventory.has(s)) continue;
      const chosen = bestSubset(groups, capacity(s, kerf));
      if (chosen.length === 0) continue;
      const partLength = chosen.reduce((sum, item) => sum + item.length, 0);
      options.push({ stock: s, items: chosen, ratio: partLength / s.length });
    }
    if (options.length === 0) break;
    options.sort((a, b) => b.ratio - a.ratio || b.stock.length - a.stock.length);
    const top = options[0]!;
    const close = random ? options.filter((o) => o.ratio >= top.ratio - 0.04) : [top];
    const pick = close[Math.floor((random?.() ?? 0) * close.length)]!;
    inventory.take(pick.stock);
    bins.push({ stock: pick.stock, items: pick.items, load: 0 });
    const taken = new Set(pick.items);
    remaining = remaining.filter((item) => !taken.has(item));
  }
  return { bins: bins.map((b) => closeBin(b, kerf)), unplaced: remaining };
}

/** First-fit in the given order on the longest stock, then shrink each board to the shortest that fits. */
function firstFit<T extends PackItem>(order: T[], stock: StockItem[], kerf: Length): PackResult<T> {
  const inventory = new Inventory(stock);
  const longestFirst = [...stock].sort((a, b) => b.length - a.length);
  const shortestFirst = [...longestFirst].reverse();
  const bins: OpenBin<T>[] = [];
  const unplaced: T[] = [];
  for (const item of order) {
    const size = item.length + kerf;
    const bin = bins.find((b) => b.load + size <= capacity(b.stock, kerf));
    if (bin) {
      bin.items.push(item);
      bin.load += size;
      continue;
    }
    const fresh = longestFirst.find((s) => inventory.has(s) && s.length >= item.length);
    if (!fresh) {
      unplaced.push(item);
      continue;
    }
    inventory.take(fresh);
    bins.push({ stock: fresh, items: [item], load: size });
  }
  for (const bin of bins) {
    inventory.give(bin.stock);
    const smaller = shortestFirst.find((s) => inventory.has(s) && bin.load <= capacity(s, kerf))!;
    inventory.take(smaller);
    bin.stock = smaller;
  }
  return { bins: bins.map((b) => closeBin(b, kerf)), unplaced };
}

export function jitter<T>(items: T[], random: Random): T[] {
  const out = [...items];
  for (let i = 0; i < out.length - 1; i++) {
    if (random() < 0.25) [out[i], out[i + 1]] = [out[i + 1]!, out[i]!];
  }
  return out;
}

/** Lower is better: unplaced parts, stock length, board count, then the biggest offcut. */
export function scorePack(result: PackResult): number[] {
  let length = 0;
  let largestOffcut = 0;
  for (const bin of result.bins) {
    length += bin.stockLength;
    largestOffcut = Math.max(largestOffcut, bin.offcut);
  }
  return [result.unplaced.length, length, result.bins.length, -largestOffcut];
}

export function compareScores(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return 0;
}

/** Every strategy's result, best first. */
export function packCandidates<T extends PackItem>(
  items: T[],
  stock: StockItem[],
  kerf: Length,
  options: PackOptions = {},
): PackResult<T>[] {
  const random = seededRandom(options.seed ?? 1);
  const sorted = [...items].sort((a, b) => b.length - a.length);
  const results = [bestFill(sorted, stock, kerf, null), firstFit(sorted, stock, kerf)];
  for (let i = 0; i < (options.attempts ?? 16); i++) {
    results.push(bestFill(sorted, stock, kerf, random));
    results.push(firstFit(jitter(sorted, random), stock, kerf));
  }
  const scored = results.map((r) => ({ r, score: scorePack(r) }));
  scored.sort((a, b) => compareScores(a.score, b.score));
  return scored.map((s) => s.r);
}

export function pack<T extends PackItem>(
  items: T[],
  stock: StockItem[],
  kerf: Length,
  options: PackOptions = {},
): PackResult<T> {
  return packCandidates(items, stock, kerf, options)[0]!;
}
