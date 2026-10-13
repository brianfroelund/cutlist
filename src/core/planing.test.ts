import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createMaterial, createPart, createStock, type Material } from './model';
import { optimizeMaterial } from './optimize';
import { blankSets, isBlank } from './planing';
import { mm } from './units';

function planed(parts: [number, number][], planing: number, trim: number, stock = 2400): Material {
  const m = createMaterial('Oak');
  m.stock = [createStock(mm(stock))];
  m.parts = parts.map(([length, qty], i) => createPart(`P${i}`, mm(length), qty));
  m.planingLength = mm(planing);
  m.trimPerEnd = mm(trim);
  return m;
}

describe('planing workflow', () => {
  it('groups 4×550 into two 1123 mm blanks from a single 2400 board', () => {
    const result = optimizeMaterial(planed([[550, 4]], 1200, 10), mm(3));
    expect(result.blanks).not.toBeNull();
    expect(result.blanks!.map((b) => b.length)).toEqual([mm(1123), mm(1123)]);
    expect(result.boards).toHaveLength(1);
    expect(result.blanks!.map((b) => b.label)).toEqual(['B1', 'B2']);
    const blank = result.blanks![0]!;
    expect(blank.parts.map((p) => p.offset)).toEqual([mm(10), mm(563)]);
  });

  it('counts parts (not blanks) as useful length', () => {
    const result = optimizeMaterial(planed([[550, 4]], 1200, 10), mm(3));
    expect(result.stats.partLength).toBe(mm(2200));
    expect(result.stats.waste).toBe(mm(200));
  });

  it('flags parts longer than the planing length as oversize blanks', () => {
    const sets = blankSets(
      [{ id: 'a', ref: 'a', label: 'Long', length: mm(1500) }],
      mm(1200),
      mm(10),
      mm(3),
    );
    expect(sets[0]![0]!.oversize).toBe(true);
    expect(sets[0]![0]!.length).toBe(mm(1520));
  });

  it('reports parts whose blank does not fit any board', () => {
    const result = optimizeMaterial(planed([[2395, 1]], 3000, 10), mm(3));
    expect(result.unplaced).toEqual([expect.objectContaining({ reason: 'too-long', count: 1 })]);
  });

  it('never builds a blank longer than the planing length unless it is a single oversize part', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 50, max: 1500 }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 600, max: 2000 }),
        fc.integer({ min: 0, max: 50 }),
        (lengths, planing, trim) => {
          const parts = lengths.map((l, i) => ({
            id: `${i}`,
            ref: `${i}`,
            label: 'P',
            length: mm(l),
          }));
          for (const set of blankSets(parts, mm(planing), mm(trim), mm(3), { attempts: 2 })) {
            const placed = set.flatMap((b) => b.parts.map((p) => p.item.id)).sort();
            expect(placed).toEqual(parts.map((p) => p.id).sort());
            for (const blank of set) {
              expect(isBlank(blank)).toBe(true);
              if (blank.oversize) expect(blank.parts).toHaveLength(1);
              else expect(blank.length).toBeLessThanOrEqual(mm(planing));
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
