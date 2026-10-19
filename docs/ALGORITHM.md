# Optimizer

Linear cutting-stock is NP-hard. We aim for results that are very good, fast (well under 100 ms for typical projects) and deterministic, not provably optimal.

## Kerf model

Each piece costs `length + kerf`. A board of length `L` fits pieces when

$$\sum_i (\ell_i + k) \le L + k$$

so n pieces need n − 1 kerfs. After the last piece one more kerf is consumed if any material remains (capped at what remains). Offsets on a board are `offset[i+1] = offset[i] + ℓ[i] + k`.

## Strategies (`pack.ts`)

All strategies take items sorted longest-first.

1. **Best fill.** Open one board at a time. For every stock type with quantity left, find the fullest subset of the remaining items using a bounded branch-and-bound subset sum. Items are grouped by length, and the search stops at 4000 nodes. Pick the stock with the highest fill ratio (part length ÷ board length). The randomized variant picks among options within 4 % of the best.
2. **First-fit decreasing.** Put each item in the first open board that fits. Otherwise open the longest available stock. Afterwards, shrink each board to the shortest stock that still holds its contents.
3. **Multi-start.** Run both deterministically, then `attempts` (default 16) times with a seeded RNG: randomized best fill, and first fit on a slightly shuffled order.

Each result gets a score tuple, compared lexicographically (lower is better):

```
[unplaced count, total stock length, board count, −largest offcut]
```

## Planing (`planing.ts`)

1. `inner = planingLength − 2 × trim`. Parts longer than `inner` become single oversize blanks.
2. Pack the other parts into "virtual boards" of length `inner` (unlimited quantity) with `packCandidates`. Keep up to 6 distinct groupings, plus the one-part-per-blank grouping.
3. Each blank is `trim + Σparts + kerfs between + trim` long. Part offsets inside start at `trim`.
4. `optimize.ts` packs each blank set onto real stock and keeps the best score. The score is the usual one, but the blank count comes before the offcut tie-break: `[unplaced, stock length, boards, blanks, −largest offcut]`. This makes the rough cuts as few and as long as the planing length allows. Blanks are then numbered B1… in board order.

Useful length (for waste %) counts final parts only, so trims and blank kerfs count as waste.

## 2D Sheet packing (`pack2d.ts`, `guillotine.ts`, `maxrects.ts`)

2D sheet optimization packs rectangular parts into rectangular sheets with perimeter edge trim, kerfs between pieces, and grain constraints.

### Grain model

- When `grain` is enabled on the material, the wood grain runs along the sheet length ($x$ axis).
- Parts with `grain: 'length'` cannot be rotated ($w$ along $x$, $h$ along $y$).
- Parts with `grain: 'width'` are rotated 90° ($h$ along $x$, $w$ along $y$).
- Parts with `grain: 'any'` can be placed in either orientation to maximize yield.

### Strategies

1. **Guillotine (`guillotine.ts`)**:
   - Edge-to-edge through-cuts executed sequentially (table/track saw).
   - Recursive binary space partitioning of free rectangles.
   - Parts are matched using Best Short Side Fit (BSSF) and Short Axis Split (SLAS) rules with kerf deduction.
   - Emits a numbered sequence of physical cuts (rips and crosscuts) with their coordinates and dimensions.
2. **Nested (`maxrects.ts`)**:
   - Maximal Rectangles bin packing (MaxRects-BSSF) for CNC routers and free layouts.
   - Maintains the maximal set of free overlapping rectangles; when a part is placed, intersecting free rectangles are split and non-maximal rectangles are pruned.
3. **Multi-start orchestration (`pack2d.ts`)**:
   - Sorts parts descending by area, then perimeter.
   - Evaluates sheets across available stock sizes.
   - Runs deterministic base pass plus randomized order perturbations using seeded RNG.
   - Lexicographical score tuple (lower is better):
     ```
     [unplaced count, total stock area, sheet count, −largest offcut area]
     ```

## Worked examples (covered by tests)

- Stock 2400, kerf 3, parts 6×700 + 4×500 → 3 boards.
- Planing 1200, trim 10, kerf 3, parts 4×550 → two blanks of 1123 mm (10 + 550 + 3 + 550 + 10) from one 2400 board.
- Sheet 2440×1220, kerf 3, edge trim 10, parts 2×(1200×600) + 2×(800×400) → 1 sheet.

## Ideas for improvement

See ROADMAP: column generation / ILP for exact solutions on small inputs, joint optimization of both stages, and keeping offcuts above a minimum useful length.
