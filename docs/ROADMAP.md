# Roadmap

Candidates, roughly in priority order. Move an item into SPEC.md when you implement it.

## Next

- [ ] Minimum useful offcut length: treat shorter leftovers as waste and prefer plans with fewer, longer offcuts.
- [ ] PNG icons (192/512) for better install support on iOS and Android.
- [ ] Per-part "grain/defect" notes shown on the cut list.
- [ ] Reorder parts and materials (drag handle and keyboard).
- [ ] Right-to-left languages (Arabic, Hebrew).

## Later

- [ ] Exact solver for small inputs (column generation or ILP in a worker) and a "how close to optimal" indicator.
- [ ] Joint optimization of planing blanks and rough stock, instead of the candidate search.
- [ ] Width/thickness awareness: ripping several parts from one wide board.
- [ ] Several projects in local storage with a project switcher.
- [ ] Native-speaker review of the machine-written translations.

## Done

- [x] 2D sheet goods cutlist calculator with guillotine through-cuts, nested (MaxRects) cuts, grain direction constraints, edge trim, responsive diagrams, and printable cut sequence.
- [x] v0.1: linear optimizer with kerf, several materials and stock lengths, the planing workflow, print, share links, offline support, and phone/desktop layouts.
