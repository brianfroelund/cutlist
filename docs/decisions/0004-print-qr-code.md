# ADR-0004: QR code on the printout, and a compact share format

- Status: accepted
- Date: 2026-10-13

## Context

The printed cutlist goes to the shop, but the project lives in the browser. A QR code on the printout should reopen the exact project on a phone. The first version encoded the old `#p=` link (JSON with keys and ids, lz-string text). For the example project that was 672 characters and an 89×89 code, which was hard to scan.

## Decision

1. **Compact share format** (`src/core/share.ts`, hash `#Q…`):
   - positional arrays instead of JSON keys
   - no ids (they are regenerated on load)
   - lengths in mm
   - `lz-string` compressed to bytes
   - bytes encoded as base-43 text: two bytes become three characters from `0-9A-Z$*+-./:`

   Those characters are in the QR alphanumeric set (5.5 bits per character instead of 8) and safe in a URL fragment. Space and `%` are left out on purpose.

2. **`qrcode-generator`** (MIT, no dependencies) instead of `uqr`. It can mix segments: the lowercase URL goes in byte mode, because GitHub Pages paths are case-sensitive, and the payload goes in alphanumeric mode. Its `isDark()` output is drawn as SVG elements, so no markup strings are used.
3. The code is built in a `beforeprint` handler. Above 81×81 modules (about version 16) it is too dense at 40 mm, so the printout shows a note pointing to Share instead.
4. The Share button uses the compact format too. Old `#p=` links still decode.

Result for the example project: 285 characters and a 53×53 code, versus 672 characters and 89×89 before.

## Consequences

- The share format has to evolve together with `Project`. Bump `FORMAT` in `share.ts` and keep decoding older versions.
- One extra runtime dependency, about 20 kB minified.
