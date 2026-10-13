# Copilot instructions

Follow [AGENTS.md](../AGENTS.md); it is the single source of agent guidance for this repo. In short:

- Read `docs/SPEC.md` before changing behaviour, and `docs/DESIGN.md` before changing visuals or copy.
- `src/core` is pure TypeScript (no DOM). Lengths are integer tenths of a mm.
- Build DOM with `h()`; never put data into `innerHTML`.
- All user-facing text goes in `src/ui/copy.ts`.
- Run `npm run check` (and `npm run e2e` for UI changes) before you finish. Update docs together with the code.
