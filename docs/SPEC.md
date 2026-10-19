# Specification

This is the source of truth for behaviour. Update it in the same change as the code.

## Goal

A very simple tool for planning linear cuts in woodworking, similar to Opticutter's linear mode. It works offline, on a phone in the shop and on a laptop at the desk, and prints a clean cutlist.

## Concepts

| Term               | Meaning                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| **Project**        | Name, units, kerf and a list of materials. One project is open at a time.                           |
| **Material**       | Either linear (1D boards) or sheet (2D panels). Has its own stock list, parts list and cut options. |
| **Stock**          | Length (and width for sheets) available with quantity (blank = unlimited). No prices, by design.    |
| **Part**           | A piece you need: label, length, width (sheets), quantity, and grain direction constraint.          |
| **Kerf**           | Width of material removed by each cut. Default 3 mm.                                                |
| **Planing length** | The longest piece you want to plane at once (linear boards only).                                   |
| **Trim per end**   | Waste at each end of a blank (snipe and squaring cut), kerf included. Default 20 mm.                |
| **Blank**          | A rough-cut piece that holds one or more parts and gets planed before final cutting.                |
| **Grain**          | Orientation of wood grain (along sheet length). Parts can be constrained or set to Any.             |
| **Edge trim**      | Border trimmed off all four edges of a sheet before cutting parts.                                  |
| **Cut style**      | Guillotine (through-cuts for table/track saws) or Nested (free placement for CNC).                  |
| **Offcut**         | Usable leftover at the end of a board or sheet.                                                     |

## Behaviour

### Inputs

- S1. Units are mm (default) or inches. Inches accept decimals, fractions and feet (`48 1/2`, `4' 2"`). Metric accepts `mm`, `cm` and `m` suffixes and a decimal comma. Switching units converts how values are shown, never the stored values.
- S2. Kerf ≥ 0. Kerf over 20 mm shows a warning.
- S3. A project can hold several materials; each is optimized independently.
- S4. Empty, zero or invalid rows are ignored by the optimizer. Invalid fields are marked but never block other edits.
- S8. Spreadsheet paste: pasting rows or columns into a part field, or anywhere outside a field, adds parts to that material. Paste into an empty row and the rows replace it. Columns are name, length, quantity. Tab, semicolon and comma separators work, as do quoted cells, a header row and `pcs`/`stk`/`x` quantity suffixes. Length + quantity or a single length column also works. Unreadable rows are skipped and counted. The paste can be undone.
- S9. Languages: en, da, sv, nb, de, nl, fr, es, it, pt, pl, ja and zh. The language is detected from the browser, can be overridden from a quiet selector in the footer, and the override is remembered. Numbers show the locale's decimal separator, and input accepts a decimal comma plus thousands separators (`1.200,5`).
- S5. Enter in a row moves to the same field in the next row, or adds a new row from the last one.
- S6. Removing anything shows an Undo toast. There are no confirmation dialogs for deletes.
- S7. On touch devices a row can be swiped left to delete it.

### Optimization

- S10. Results update automatically while you type (debounced) and run in a Web Worker.
- S11. The order of preference: place every part; then least total stock length; then fewest boards; then the largest single offcut.
- S12. Pieces on a board are separated by one kerf. No kerf is charged after the last piece if it ends exactly at the board end. If the offcut is thinner than a kerf, only the offcut is consumed.
- S13. Limited stock quantities are respected. Parts that can't be placed are reported as _too long_ (longer than any board) or _out of stock_.
- S14. Results are deterministic for the same input.

### Planing workflow (per material, optional)

- S20. When enabled, parts are first grouped into blanks. Blank length = trim + parts + kerfs between parts + trim, and must be ≤ planing length.
- S21. A part that alone exceeds the planing length becomes its own _oversize_ blank and is flagged.
- S22. Blanks are then optimized onto stock like parts. Several blank groupings are tried. The one with the best stock result wins; on a tie, the one with fewer (longer) blanks wins. The default planing length is 2200 mm.
- S23. Output has two steps: (1) rough cut boards into blanks B1, B2, … (2) plane, then cut each blank into its parts.

### Sheet goods workflow (per material, 2D)

- S50. When material kind is `sheet`, stock items require both length and width. Parts require length, width, and an optional grain constraint (`length`, `width`, or `any`).
- S51. When `grain` is enabled on the material, grain runs along sheet length (x axis). A part with `grain: 'length'` cannot be rotated; a part with `grain: 'width'` is rotated 90 degrees so its width aligns with length; `any` permits rotation if it improves nesting yield.
- S52. Edge trim (default 10 mm) is deducted from all four perimeter edges before placing parts.
- S53. Two cut styles are supported:
  - **Guillotine**: Parts are packed into recursive through-cuts suitable for table saws and track saws, outputting a numbered cut sequence (rips and crosscuts).
  - **Nested**: MaxRects placement for CNC routers and free layouts.
- S54. Output includes to-scale 2D sheet diagrams, waste %, largest offcut, and step-by-step guillotine cut instructions. Print outputs a greyscale parts table and sheet diagram.

### Output

- S30. A summary shows boards, total stock length, waste %, a one-line verdict and a shopping list per material.
- S31. Each stock board group and each planing blank group shows a to-scale bar, a cut list and one checkbox in its heading. Checking it completes the entire group (including all copies in `2 × 2400 mm`); unchecking reopens it. Stock and blank groups can be checked independently. Individual cuts have no checkboxes. Completion is temporary and resets when results are rendered again or the page reloads; it is not saved or shared. Consecutive identical cuts are collapsed (`3 × 700 mm Leg`). The group-level checkbox also appears in print, retaining its checked state.
- S32. Parts are told apart by pattern (8 patterns), never by color.
- S34. The print header has a QR code with the project's share link, so a phone can reopen the exact project from the paper. If the link is too long to scan reliably, a short note suggests using Share instead.
- S33. Print produces a greyscale document. Page 1 has a project header with date and kerf, the summary, and a complete parts list per material (pattern, part, length, quantity, totals, planing settings). Each material follows on its own page. Inputs and controls are hidden. The parts list appears only in print.

### Persistence and sharing

- S40. The project auto-saves to localStorage.
- S41. Export/import as a `.cutlist.json` file (schema-versioned, validated on import, max 1 MB).
- S42. Share creates a URL with the project in the hash, in a compact format (`#Q…`): positional fields, no ids, lz-compressed, base-43 text. Older `#p=` links still open. Opening a link asks before replacing a project that has parts. The hash is removed after loading.
- S43. The app works offline after the first visit (service worker) and can be installed (web manifest).

### Delight

See [DESIGN.md](DESIGN.md#delight). None of it may get in the way of entering data.

## Out of scope (for now)

Width/thickness optimization for solid wood, accounts, pricing, and a server. See [ROADMAP.md](ROADMAP.md).
