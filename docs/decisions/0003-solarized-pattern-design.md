# ADR-0003: Solarized, pattern-coded, greyscale print

- Status: accepted
- Date: 2026-10-13

## Context

The owner wants a simple, timeless design that uses color sparingly, likes Solarized Light, and requires printed cutlists to be greyscale.

## Decision

- Solarized palette with mostly neutral tokens; accents are reserved for the brand, focus, errors and warnings.
- Parts are told apart by 8 CSS background patterns, not hues. The same patterns appear on screen and on paper.
- `print.css` forces a white/black palette and `filter: grayscale(1)`.

## Consequences

- With more than 8 part types, patterns repeat; the labels still identify the parts.
- Designs must be checked in print preview.
