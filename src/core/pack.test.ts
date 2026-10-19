import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { StockItem } from './model';
import { pack, type PackItem, type PackResult } from './pack';
import { mm } from './units';

let counter = 0;
const items = (length: number, count: number, label = 'P'): PackItem[] => {
  const ref = `r${counter++}`;
  return Array.from({ length: count }, (_, i) => ({ id: `${ref}#${i}`, ref, label, length }));
};
const stock = (length: number, quantity: number | null = null, id = `s${length}`): StockItem => ({
  id,
  length,
  quantity,
  width: 0,
});

function assertValid(result: PackResult, kerf: number) {
  for (const bin of result.bins) {
    expect(bin.used).toBeLessThanOrEqual(bin.stockLength);
    expect(bin.offcut).toBe(bin.stockLength - bin.used);
    bin.items.forEach((p, i) => {
      expect(p.offset + p.item.length).toBeLessThanOrEqual(bin.stockLength);
      const next = bin.items[i + 1];
      if (next) expect(next.offset).toBeGreaterThanOrEqual(p.offset + p.item.length + kerf);
    });
  }
}

describe('pack', () => {
  it('needs 3 boards for 6×700 + 4×500 on 2400 with a 3 mm kerf', () => {
    const parts = [...items(mm(700), 6), ...items(mm(500), 4)];
    const result = pack(parts, [stock(mm(2400))], mm(3));
    expect(result.bins).toHaveLength(3);
    expect(result.unplaced).toHaveLength(0);
    assertValid(result, mm(3));
  });

  it('does not charge a kerf after a part that ends exactly at the board end', () => {
    const result = pack(items(mm(498.5), 2), [stock(mm(1000))], mm(3));
    expect(result.bins).toHaveLength(1);
    expect(result.bins[0]!.offcut).toBe(0);
  });

  it('charges only the remaining length when the offcut is thinner than the kerf', () => {
    const result = pack(items(mm(999), 1), [stock(mm(1000))], mm(3));
    expect(result.bins[0]!.used).toBe(mm(1000));
  });

  it('picks the shorter stock when it is enough', () => {
    const result = pack(items(mm(900), 1), [stock(mm(3000)), stock(mm(1000))], mm(3));
    expect(result.bins[0]!.stockLength).toBe(mm(1000));
  });

  it('respects limited stock quantities', () => {
    const result = pack(items(mm(2000), 3), [stock(mm(2400), 2)], mm(3));
    expect(result.bins).toHaveLength(2);
    expect(result.unplaced).toHaveLength(1);
  });

  it('leaves parts that are longer than every board unplaced', () => {
    const result = pack(items(mm(3000), 1), [stock(mm(2400))], mm(3));
    expect(result.bins).toHaveLength(0);
    expect(result.unplaced).toHaveLength(1);
  });

  it('is deterministic', () => {
    const parts = [...items(mm(733), 7), ...items(mm(412), 9), ...items(mm(1210), 3)];
    const a = pack(parts, [stock(mm(2400)), stock(mm(3600))], mm(3));
    const b = pack(parts, [stock(mm(2400)), stock(mm(3600))], mm(3));
    expect(a).toEqual(b);
  });

  it('places every part exactly once without overfilling any board', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 3000 }), { minLength: 1, maxLength: 40 }),
        fc.array(fc.integer({ min: 500, max: 4000 }), { minLength: 1, maxLength: 3 }),
        fc.integer({ min: 0, max: 50 }),
        (lengths, stockLengths, kerf) => {
          const parts = lengths.flatMap((l) => items(l * 10, 1));
          const boards = [...new Set(stockLengths)].map((l) => stock(l * 10));
          const result = pack(parts, boards, kerf, { attempts: 4 });
          assertValid(result, kerf);
          const placed = result.bins.flatMap((b) => b.items.map((p) => p.item.id));
          const all = [...placed, ...result.unplaced.map((i) => i.id)];
          expect(new Set(all).size).toBe(parts.length);
          expect(all).toHaveLength(parts.length);
          const longest = Math.max(...boards.map((b) => b.length));
          for (const u of result.unplaced) expect(u.length).toBeGreaterThan(longest);
        },
      ),
      { numRuns: 150 },
    );
  });
});
