import type { Length, StockItem } from './model';
import { packCandidates, type PackItem, type PackOptions, type Placed } from './pack';

export interface Blank extends PackItem {
  /** Final parts inside the blank; offsets include the leading trim. */
  parts: Placed[];
  trimPerEnd: Length;
  /** A single part that is longer than the planing length allows. */
  oversize: boolean;
}

const MAX_BLANK_SETS = 6;

export function isBlank(item: PackItem): item is Blank {
  return 'parts' in item;
}

function makeBlank(
  parts: PackItem[],
  trimPerEnd: Length,
  kerf: Length,
  oversize: boolean,
  index: number,
): Blank {
  const sorted = [...parts].sort((a, b) => b.length - a.length);
  let offset = trimPerEnd;
  const placed = sorted.map((item) => {
    const p = { item, offset };
    offset += item.length + kerf;
    return p;
  });
  const id = `blank-${index}`;
  return {
    id,
    ref: id,
    label: '',
    length: offset - kerf + trimPerEnd,
    parts: placed,
    trimPerEnd,
    oversize,
  };
}

function signature(groups: PackItem[][]): string {
  return groups
    .map((g) => g.map((i) => i.length).join('+'))
    .sort()
    .join('|');
}

/**
 * Candidate groupings of parts into planing blanks no longer than `planingLength`.
 * Blank length = trim + parts + kerfs between parts + trim.
 */
export function blankSets(
  parts: PackItem[],
  planingLength: Length,
  trimPerEnd: Length,
  kerf: Length,
  options: PackOptions = {},
): Blank[][] {
  const inner = planingLength - 2 * trimPerEnd;
  const fits = parts.filter((p) => p.length <= inner);
  const oversize = parts.filter((p) => p.length > inner).map((p) => [p]);
  const build = (groups: PackItem[][]) =>
    [...groups, ...oversize].map((g, i) => makeBlank(g, trimPerEnd, kerf, i >= groups.length, i));

  if (fits.length === 0) return [build([])];

  const planer: StockItem[] = [{ id: 'planing-length', length: inner, quantity: null }];
  const seen = new Set<string>();
  const sets: Blank[][] = [];
  const singles = fits.map((p) => [p]);
  for (const candidate of packCandidates(fits, planer, kerf, options)) {
    const groups = candidate.bins.map((b) => b.items.map((p) => p.item));
    const key = signature(groups);
    if (seen.has(key)) continue;
    seen.add(key);
    sets.push(build(groups));
    if (sets.length >= MAX_BLANK_SETS) break;
  }
  if (!seen.has(signature(singles))) sets.push(build(singles));
  return sets;
}
