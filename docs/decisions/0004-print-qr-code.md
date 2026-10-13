# ADR-0004: QR code on the printout (uqr)

- Status: accepted
- Date: 2026-10-13

## Context

The printed cutlist goes to the shop, but the project lives in the browser. A QR code on the printout should reopen the exact project on a phone. QR encoding (Reed–Solomon, masking, version selection) is too much code to write and maintain ourselves.

## Decision

- Add `uqr` (MIT, tiny, no dependencies, ESM) and use only its `encode()`. We draw the modules as SVG elements ourselves, so no markup strings enter the DOM.
- The code holds the existing share link (`#p=…`) and is generated in a `beforeprint` handler, so editing never pays for encoding.
- Above `MAX_QR_TEXT` (1200 characters) the code gets too dense to scan at 40 mm, so the printout shows a short note pointing to Share instead.

## Consequences

- A second runtime dependency (~10 kB minified).
- Very large projects get no QR code on the printout. Possible fix later: a shorter share format.
