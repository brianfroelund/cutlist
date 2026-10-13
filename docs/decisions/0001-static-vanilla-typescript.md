# ADR-0001: Static Vite + TypeScript app without a UI framework

- Status: accepted
- Date: 2026-10-13

## Context

The app must be hosted on GitHub Pages and be simple enough for AI agents to change safely. Its UI is two panels of forms and a results view.

## Decision

- Vite + strict TypeScript with no UI framework. DOM is built with a tiny `h()` helper, and each panel is re-rendered as a whole.
- Pure domain logic in `src/core`, enforced by ESLint. The optimizer runs in a Web Worker.
- Lengths are integers in tenths of a mm (1 in = 254 units exactly).
- The repo is public, because Pages on a private repo needs a paid plan.
- The only runtime dependency is `lz-string` for compact share links.

## Consequences

- A tiny bundle, fast load and few moving parts.
- Re-rendering a whole panel means value edits must not trigger a rebuild, or focus is lost. `ChangeOptions.structure` handles this.
- If interactions become much richer, revisit this with a new ADR (e.g. Preact or Lit).
