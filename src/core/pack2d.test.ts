import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createMaterial, createPart, type StockItem } from './model';
import { expandSheetParts, pack2d, type SheetItem } from './pack2d';
import { overlaps, type Rect } from './rect';
import { mm } from './units';

function makeItem(id: string, w: number, h: number, rotatable = true): SheetItem {
  return { id, ref: id, label: id, w, h, rotatable };
}

function makeSheetStock(
  length: number,
  width: number,
  quantity: number | null = null,
  id = `stock-${length}x${width}`,
): StockItem {
  return { id, length, width, quantity };
}

function isGuillotineCuttable(rects: Rect[], bounds: Rect, kerf: number): boolean {
  if (rects.length <= 1) return true;

  // Look for a horizontal guillotine cut line that cleanly divides rects into top and bottom non-empty sets
  for (const r of rects) {
    const cutY = r.y + r.h; // inflated boundary
    if (cutY > bounds.y && cutY < bounds.y + bounds.h) {
      const top = rects.filter((item) => item.y + item.h <= cutY);
      const bottom = rects.filter((item) => item.y >= cutY);
      if (top.length > 0 && bottom.length > 0 && top.length + bottom.length === rects.length) {
        const topBounds: Rect = { x: bounds.x, y: bounds.y, w: bounds.w, h: cutY - bounds.y };
        const bottomBounds: Rect = {
          x: bounds.x,
          y: cutY,
          w: bounds.w,
          h: bounds.y + bounds.h - cutY,
        };
        if (
          isGuillotineCuttable(top, topBounds, kerf) &&
          isGuillotineCuttable(bottom, bottomBounds, kerf)
        ) {
          return true;
        }
      }
    }
  }

  // Look for a vertical guillotine cut line
  for (const r of rects) {
    const cutX = r.x + r.w; // inflated boundary
    if (cutX > bounds.x && cutX < bounds.x + bounds.w) {
      const left = rects.filter((item) => item.x + item.w <= cutX);
      const right = rects.filter((item) => item.x >= cutX);
      if (left.length > 0 && right.length > 0 && left.length + right.length === rects.length) {
        const leftBounds: Rect = { x: bounds.x, y: bounds.y, w: cutX - bounds.x, h: bounds.h };
        const rightBounds: Rect = {
          x: cutX,
          y: bounds.y,
          w: bounds.x + bounds.w - cutX,
          h: bounds.h,
        };
        if (
          isGuillotineCuttable(left, leftBounds, kerf) &&
          isGuillotineCuttable(right, rightBounds, kerf)
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

describe('pack2d worked examples', () => {
  const stock2440x1220 = [makeSheetStock(mm(2440), mm(1220))];

  it('example 1: 4 x 1200x600 fits on 1 sheet with kerf 3', () => {
    const items = [
      makeItem('1', mm(1200), mm(600)),
      makeItem('2', mm(1200), mm(600)),
      makeItem('3', mm(1200), mm(600)),
      makeItem('4', mm(1200), mm(600)),
    ];
    const res = pack2d(items, stock2440x1220, {
      style: 'guillotine',
      kerf: mm(3),
      edgeTrim: 0,
    });
    expect(res.unplaced).toHaveLength(0);
    expect(res.sheets).toHaveLength(1);
    expect(res.sheets[0]!.placements).toHaveLength(4);
  });

  it('example 2: 4 x 1220x610 requires 2 sheets with kerf 3', () => {
    const items = [
      makeItem('1', mm(1220), mm(610)),
      makeItem('2', mm(1220), mm(610)),
      makeItem('3', mm(1220), mm(610)),
      makeItem('4', mm(1220), mm(610)),
    ];
    const res = pack2d(items, stock2440x1220, {
      style: 'guillotine',
      kerf: mm(3),
      edgeTrim: 0,
    });
    expect(res.unplaced).toHaveLength(0);
    expect(res.sheets).toHaveLength(2);
  });

  it('example 3: exactly 1 x 2440x1220 has no cuts and no offcut', () => {
    const items = [makeItem('1', mm(2440), mm(1220), false)];
    const res = pack2d(items, stock2440x1220, {
      style: 'guillotine',
      kerf: mm(3),
      edgeTrim: 0,
    });
    expect(res.unplaced).toHaveLength(0);
    expect(res.sheets).toHaveLength(1);
    expect(res.sheets[0]!.cuts).toHaveLength(0);
    expect(res.sheets[0]!.largestOffcut).toBeNull();
  });

  it('example 4: edge trim 10 rejects 2440x1220 but allows 2420x1200', () => {
    const tooBig = [makeItem('1', mm(2440), mm(1220), false)];
    const res1 = pack2d(tooBig, stock2440x1220, {
      style: 'guillotine',
      kerf: mm(3),
      edgeTrim: mm(10),
    });
    expect(res1.unplaced).toHaveLength(1);

    const fits = [makeItem('2', mm(2420), mm(1200), false)];
    const res2 = pack2d(fits, stock2440x1220, {
      style: 'guillotine',
      kerf: mm(3),
      edgeTrim: mm(10),
    });
    expect(res2.unplaced).toHaveLength(0);
    expect(res2.sheets).toHaveLength(1);
  });

  it('example 5: grain on rotates only when part.grain is any', () => {
    const mat = createMaterial('Ply', 'sheet');
    mat.grain = true;
    mat.parts = [createPart('Fixed', mm(1000), 1, mm(2000), 'length')];
    const items1 = expandSheetParts(mat);
    const res1 = pack2d(items1, stock2440x1220, {
      style: 'guillotine',
      kerf: mm(3),
      edgeTrim: 0,
    });
    expect(res1.unplaced).toHaveLength(1);

    mat.parts[0]!.grain = 'any';
    const items2 = expandSheetParts(mat);
    const res2 = pack2d(items2, stock2440x1220, {
      style: 'guillotine',
      kerf: mm(3),
      edgeTrim: 0,
    });
    expect(res2.unplaced).toHaveLength(0);
    expect(res2.sheets[0]!.placements[0]!.rotated).toBe(true);
  });

  it('example 6: grain on with grain width places with rotated true', () => {
    const mat = createMaterial('Ply', 'sheet');
    mat.grain = true;
    mat.parts = [createPart('Shelf', mm(600), 1, mm(300), 'width')];
    const items = expandSheetParts(mat);
    const res = pack2d(items, stock2440x1220, {
      style: 'guillotine',
      kerf: mm(3),
      edgeTrim: 0,
    });
    expect(res.unplaced).toHaveLength(0);
    const placed = res.sheets[0]!.placements[0]!;
    expect(placed.w).toBe(mm(300));
    expect(placed.h).toBe(mm(600));
  });

  it('example 7: guillotine cut numbers run 1..N', () => {
    const items = [makeItem('1', mm(1200), mm(600)), makeItem('2', mm(1200), mm(600))];
    const res = pack2d(items, stock2440x1220, {
      style: 'guillotine',
      kerf: mm(3),
      edgeTrim: 0,
    });
    expect(res.sheets[0]!.cuts.length).toBeGreaterThan(0);
    res.sheets[0]!.cuts.forEach((c, idx) => {
      expect(c.n).toBe(idx + 1);
    });
  });
});

describe('pack2d property tests', () => {
  it('satisfies placement non-overlap, bounds, and inventory invariants', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 6 }),
            w: fc.integer({ min: mm(50), max: mm(1200) }),
            h: fc.integer({ min: mm(50), max: mm(800) }),
            rotatable: fc.boolean(),
          }),
          { minLength: 1, maxLength: 8 },
        ),
        fc.constantFrom<'guillotine' | 'nested'>('guillotine', 'nested'),
        (rawItems, style) => {
          const items: SheetItem[] = rawItems.map((r, i) => ({
            id: `${r.id}#${i}`,
            ref: r.id,
            label: `Part ${i}`,
            w: r.w,
            h: r.h,
            rotatable: r.rotatable,
          }));
          const stock = [makeSheetStock(mm(2440), mm(1220), 2)];
          const kerf = mm(3);
          const edgeTrim = mm(5);

          const res = pack2d(items, stock, {
            style,
            kerf,
            edgeTrim,
            attempts: 2,
            seed: 42,
          });

          // Check placed + unplaced count
          const totalPlaced = res.sheets.reduce((sum, s) => sum + s.placements.length, 0);
          expect(totalPlaced + res.unplaced.length).toBe(items.length);

          for (const sheet of res.sheets) {
            // Check bounds
            for (const p of sheet.placements) {
              expect(p.x).toBeGreaterThanOrEqual(edgeTrim);
              expect(p.y).toBeGreaterThanOrEqual(edgeTrim);
              expect(p.x + p.w).toBeLessThanOrEqual(sheet.length - edgeTrim);
              expect(p.y + p.h).toBeLessThanOrEqual(sheet.width - edgeTrim);

              // Non-rotatable items check
              if (!p.item.rotatable) {
                expect(p.w).toBe(p.item.w);
                expect(p.h).toBe(p.item.h);
                expect(p.rotated).toBe(false);
              }
            }

            // Check non-overlap with kerf inflation
            const inflated: Rect[] = sheet.placements.map((p) => ({
              x: p.x,
              y: p.y,
              w: p.w + kerf,
              h: p.h + kerf,
            }));

            for (let i = 0; i < inflated.length; i++) {
              for (let j = i + 1; j < inflated.length; j++) {
                expect(overlaps(inflated[i]!, inflated[j]!)).toBe(false);
              }
            }

            // Guillotine check
            if (style === 'guillotine' && sheet.placements.length > 1) {
              const bounds: Rect = {
                x: edgeTrim,
                y: edgeTrim,
                w: sheet.length - 2 * edgeTrim + kerf,
                h: sheet.width - 2 * edgeTrim + kerf,
              };
              expect(isGuillotineCuttable(inflated, bounds, kerf)).toBe(true);
            }
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it('is deterministic for identical inputs', () => {
    const items = [
      makeItem('1', mm(800), mm(400)),
      makeItem('2', mm(600), mm(500)),
      makeItem('3', mm(1000), mm(300)),
    ];
    const stock = [makeSheetStock(mm(2440), mm(1220))];
    const opt = { style: 'guillotine' as const, kerf: mm(3), edgeTrim: mm(5), seed: 123 };
    const r1 = pack2d(items, stock, opt);
    const r2 = pack2d(items, stock, opt);
    expect(r1).toEqual(r2);
  });
});
