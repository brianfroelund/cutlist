# AGENTS.md

Guidance for AI agents (and humans) working on **cutlist**. Everything in this repository is AI-developed, so these rules are the contract. Read this file first, then the doc relevant to your task.

## What this is

A static, client-only web app that plans linear (1D) boards and sheet goods (2D) cuts for woodworking. You enter the stock you have and the parts you need, and it produces an optimized, printable cutlist. Optionally it adds a two-stage plan: rough-cut to planing blanks, then cut the blanks to final parts. It is hosted on GitHub Pages at https://brianfroelund.github.io/cutlist/.

| Doc                                          | Read it when…                                              |
| -------------------------------------------- | ---------------------------------------------------------- |
| [docs/SPEC.md](docs/SPEC.md)                 | You change behaviour. It is the source of truth.           |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | You add files/modules or move responsibilities.            |
| [docs/ALGORITHM.md](docs/ALGORITHM.md)       | You touch `src/core/pack.ts`, `planing.ts`, `optimize.ts`. |
| [docs/DESIGN.md](docs/DESIGN.md)             | You touch anything visual, copy, motion or print.          |
| [docs/ROADMAP.md](docs/ROADMAP.md)           | You look for what to build next.                           |
| [docs/decisions/](docs/decisions/)           | You want to know why something is the way it is.           |

## Stack

- Vite + TypeScript (strict), **no UI framework**, no backend.
- Vitest + fast-check for unit/property tests; Playwright for e2e (desktop 1280×800 and Pixel 7).
- ESLint (typescript-eslint) + Prettier.
- Runtime dependencies: `lz-string` (share links) and `qrcode-generator` (print QR code; see ADR-0004).

## Commands

```sh
npm install
npm run dev        # http://localhost:5173/cutlist/
npm run check      # lint + format check + typecheck + unit tests + build (must pass)
npm run e2e        # Playwright (first time: npx playwright install chromium)
npm run format     # fix formatting
```

## Layout

```
src/core/     pure domain logic — NO DOM, window, storage (enforced by ESLint)
src/worker/   Web Worker wrapper around the optimizer
src/ui/       DOM rendering, state store, persistence, delight/ touches
src/styles/   tokens.css (Solarized), app.css, print.css
public/       static files copied as-is (manifest, icon, service worker)
e2e/          Playwright specs
docs/         spec, architecture, algorithm, design, roadmap, ADRs
```

## Rules

1. **Lengths are integers in tenths of a millimetre** (`Length`). Convert only at the UI edge through `src/core/units.ts`. Never store floats or inches.
2. **`src/core` stays pure and deterministic.** Randomness must come from `seededRandom`, so the same input always gives the same result.
3. **Never use `innerHTML` with data.** Build DOM with `h()` from `src/ui/dom.ts` (text becomes text nodes). Static SVG constants in `icons.ts` are the only exception.
4. **Untrusted input** (imported files, share links, localStorage) must go through `parseProject` in `src/core/serialize.ts`. If you change the schema, bump `SCHEMA_VERSION` and add a step to `migrate()`, plus a test.
5. **All user-facing text lives in `src/ui/i18n/`.** Add new keys to `en.ts` first (the source catalogue), then to every other locale; the typecheck fails if one is missing. Never hard-code UI strings. Follow the tone in DESIGN.md.
6. **Mobile and desktop are equal citizens.** Check at 375 px and 1280 px. Touch targets are at least 44 px, and inputs are 16 px (no iOS zoom).
7. **Print is greyscale.** Parts are told apart by pattern, never by color.
8. **Respect `prefers-reduced-motion`.** Every animation must degrade to none.
9. Keep it simple. Don't add dependencies or abstractions without an ADR in `docs/decisions/`.
10. Comments explain _why_, in one short line. Don't narrate code.

## Definition of done

- [ ] `npm run check` passes; `npm run e2e` passes when the UI changed.
- [ ] New or changed core logic has unit tests (property tests for invariants).
- [ ] SPEC.md is updated if behaviour changed; ALGORITHM.md if the optimizer changed; DESIGN.md if visuals or copy rules changed.
- [ ] Verified on a narrow (phone) and a wide (laptop) viewport, plus print preview, for UI changes.
- [ ] Conventional Commit message (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).

## Deployment

Every push to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`. Pull requests run `.github/workflows/ci.yml`. The Vite `base` is `/cutlist/`; keep that in mind for absolute URLs.
