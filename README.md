# cutlist

A simple, friendly **linear cutlist optimizer** for woodworkers.

**→ https://brianfroelund.github.io/cutlist/**

- Enter the boards you have and the parts you need, for as many materials as you like.
- Kerf-aware optimization across several stock lengths, with limited or unlimited quantities and optional prices.
- **Planing workflow:** rough-cut to an ideal planing length, plane, then cut to final lengths.
- Prints a clean greyscale cutlist with checkboxes, one material per page.
- mm or inches (fractions welcome), auto-save, JSON export/import and share links.
- Works on a phone in the shop and on a laptop at the desk. It works offline too.

## Develop

```sh
npm install
npm run dev     # http://localhost:5173/cutlist/
npm run check   # lint, format, typecheck, tests, build
npm run e2e     # Playwright (npx playwright install chromium first)
```

This project is developed by AI agents. Start with [AGENTS.md](AGENTS.md).
