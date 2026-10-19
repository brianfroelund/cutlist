# cutlist

A simple, friendly **cut list optimizer** for woodworkers — boards and sheet goods.

**→ https://brianfroelund.github.io/cutlist/**

- Enter the boards and sheets you have and the parts you need, for as many materials as you like.
- **1D dimensional lumber & 2D sheet goods:** optimize solid timber, plywood, MDF and panels in one project.
- **Sheet layouts:** guillotine through-cuts for table/track saws or nested placement for CNC, with grain direction constraints and edge trimming.
- Kerf-aware optimization across several stock sizes, with limited or unlimited quantities.
- **Planing workflow:** rough-cut lumber to an ideal planing length, plane, then cut to final lengths.
- Prints a clean greyscale cutlist with diagrams, cut sequences and checkboxes, one material per page.
- mm or inches (fractions welcome), auto-save, JSON export/import and compact share links.
- Works on a phone in the shop and on a laptop at the desk. It works offline too.

## Develop

```sh
npm install
npm run dev     # http://localhost:5173/cutlist/
npm run check   # lint, format, typecheck, tests, build
npm run e2e     # Playwright (npx playwright install chromium first)
```

This project is developed by AI agents. Start with [AGENTS.md](AGENTS.md).
