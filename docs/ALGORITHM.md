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
4. `optimize.ts` packs each blank set onto real stock and keeps the best score. Blanks are then numbered B1… in board order.

Useful length (for waste %) counts final parts only, so trims and blank kerfs count as waste.

## Worked examples (covered by tests)

- Stock 2400, kerf 3, parts 6×700 + 4×500 → 3 boards.
- Planing 1200, trim 10, kerf 3, parts 4×550 → two blanks of 1123 mm (10 + 550 + 3 + 550 + 10) from one 2400 board.

## Ideas for improvement

See ROADMAP: column generation / ILP for exact solutions on small inputs, joint optimization of both stages, and keeping offcuts above a minimum useful length.
