# 5. Sheet Goods (2D Cutting & Grain Direction)

Date: 2026-10-19

## Status

Accepted

## Context

`cutlist` began as a 1D linear cutlist optimizer for dimensional lumber and boards. Woodworkers frequently build projects that combine solid wood boards (face frames, legs, rails) with sheet goods such as plywood, MDF, and melamine (carcasses, drawer bottoms, shelves, panels).

Key requirements for sheet goods cutting in woodworking:

1. **Guillotine cutting**: Most woodworkers use a table saw or track saw. Cuts must be edge-to-edge (guillotine cuts) that can be executed in an ordered physical sequence.
2. **Nested cutting**: Users with CNC routers or track saws making plunge cuts need nested (free-form) 2D bin packing to maximize sheet yield.
3. **Grain direction**: Veneered plywood and solid timber panels have grain running along their length. Certain parts (such as door fronts or drawer faces) must maintain grain orientation, while others (like hidden drawer bottoms or painted MDF) can be rotated in any direction.
4. **Edge trimming**: Factory sheet edges are often dinged or out of square. Users need to trim a consistent border off all four sides before cutting parts.
5. **Simplicity and performance**: The client must remain static, pure, deterministic, and fast without third-party heavy dependencies.

## Decision

1. **Per-Material Kind**:
   - A material is either `kind: 'linear'` (1D boards) or `kind: 'sheet'` (2D sheet goods). A single project can mix both seamlessly.
2. **Grain Model**:
   - Sheet stock grain runs along the sheet length (x-axis).
   - If `material.grain` is enabled, parts specify `grain: 'length' | 'width' | 'any'`. 'Any' allows the optimizer to rotate parts 90 degrees; 'length' and 'width' enforce the grain direction.
3. **Dual 2D Packing Algorithms**:
   - **Guillotine (`cutStyle: 'guillotine'`)**: Recursive 2D guillotine cut tree producing an ordered list of through-cuts (rips and crosscuts) with numbered cutting steps.
   - **Nested (`cutStyle: 'nested'`)**: MaxRects bin packing (Best Short Side Fit) for CNC routing and free layouts.
   - Multi-start random perturbation using deterministic seeded pseudo-random numbers (`mulberry32`).
4. **Edge Trim**:
   - Specifiable per sheet material (default 10 mm). Deducted from all four outer edges prior to placing parts and computing cut lines.
5. **Serialization and Share Links**:
   - Project schema version bumped to `2`. Version 1 projects migrate seamlessly on load.
   - Share link format bumped to version `3` with full backward compatibility for version `2`.
6. **UI and Print**:
   - Responsive CSS grid for sheet stock (Length, Width, Qty) and sheet parts (Part, Length, Width, Qty, Grain).
   - To-scale 2D sheet layout diagrams showing part positions, patterns, and numbered guillotine cut lines.
   - Expandable step-by-step cut sequence list that automatically expands during print preview.

## Consequences

- Full 2D panel planning is supported without changing the app's zero-dependency, pure client-side architecture.
- All domain logic in `src/core` remains pure and tested with property-based tests (`fast-check`).
- Backward compatibility is fully preserved for existing saved projects and share URLs.
