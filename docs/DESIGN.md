# Design

## Direction

**Simple and timeless.** It should feel like a well-made drawing on good paper: ink, paper, rules and a little serif. It should not chase trends. When in doubt, remove.

- **Palette:** [Solarized](https://ethanschoonover.com/solarized/). Light is the default (base3 paper, base02 ink); dark follows the system (base03 paper). Tokens are in `src/styles/tokens.css`.
- **Color is used sparingly.** The only accents:
  - orange: the brand blade
  - blue: focus rings
  - red: errors and swipe-to-delete
  - yellow: warnings

  Everything else is neutral.

- **Typography:** a system sans for UI and a classic serif (Iowan Old Style, Charter, Palatino, Georgia) for headings, numbers in the summary, and the verdict. Use tabular numerals everywhere.
- **Shapes:** 1 px rules, 6–10 px radii, no drop shadows.
- **Parts are told apart by pattern, never color.** There are 8 patterns (`data-pattern` 0–7): plain, two diagonals, vertical lines, horizontal lines, dots, crosshatch and grid. Offcut is empty paper with a dashed outline. Kerf is a solid ink line. Trim is a dense hatch. Blanks have a double border.

## Print

Always greyscale (`print.css` also applies `filter: grayscale(1)`). It shows:

- a header with the project name, date and kerf
- the summary
- each material on its own page, with bars, cut lists and one completion checkbox per stock or planing blank group

No controls are printed.

## Responsive

- **< 600 px:** rows become small cards with visible labels. Part rows stack the label above length and quantity.
- **< 900 px:** two tabs (Stock & parts / Cutlist) and a fixed bottom bar (Share, Print, Export, Import) within thumb reach.
- **≥ 900 px:** two columns. Inputs on the left; results on the right, sticky and scrolling on their own.
- Touch targets ≥ 44 px; input font 16 px; safe-area insets respected.

## Voice

Plainspoken and warm, the way a friendly shop teacher talks. Use short sentences, and at most one gentle joke per message. Never make fun of the user. All copy is in `src/ui/i18n/`. Translations keep the same tone and use the local woodworking terms (e.g. Danish “snitbredde”, “høvlelængde”), not literal translations.

## Delight

Small, optional and never in the way. Each one respects `prefers-reduced-motion`.

| Touch                                                                                                                                                                                               | Where                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| FLIP: pieces glide to their new positions when results change                                                                                                                                       | `ui/delight/flip.ts`    |
| Waste verdicts ("Your lumberyard will miss you")                                                                                                                                                    | `copy.wasteVerdict`     |
| Sawdust drift the first time a plan reaches ≤ 2 % waste (once per session)                                                                                                                          | `ui/delight/sawdust.ts` |
| Swipe left to delete on touch, with Undo                                                                                                                                                            | `ui/delight/swipe.ts`   |
| Spinning saw-blade favicon while a slow optimization runs                                                                                                                                           | `ui/delight/favicon.ts` |
| Brand blade spins on hover                                                                                                                                                                          | `app.css`               |
| Stock and blank completion: checkmark pops and a brief sweep crosses the bar; the heading stays struck through, with cut details readable. Reduced motion keeps the checked state without movement. | `app.css`               |
| Rotating shop tips in the footer (tap for another)                                                                                                                                                  | `copy.tips`             |
| Keyboard shortcuts (`?` for help)                                                                                                                                                                   | `ui/app.ts`             |
| Drag the brand blade to saw the page apart; halves fall away, Esc or "Tidy up" restores                                                                                                             | `ui/delight/blade.ts`   |
| Workbench illustration in the empty state                                                                                                                                                           | `ui/icons.ts`           |

Add a new touch only if it is cheap, optional and fits the voice. Add it to this table.
