# ADR-0002: Two-stage planing workflow

- Status: accepted
- Date: 2026-10-13

## Context

Rough lumber is cut into manageable lengths before it is planed. Planing short pieces is unsafe and causes snipe; planing very long pieces is impractical. The user wants to rough-cut to an ideal planing length, plane, and then cut to final lengths.

## Decision

- Each material has an optional `planingLength` and a `trimPerEnd`. Trim is waste per blank end and includes the squaring cut's kerf.
- Parts are grouped into blanks no longer than the planing length. Several groupings are tried, and the one that gives the best stock result wins.
- A single part longer than the planing length becomes its own flagged blank instead of failing.
- Output is two steps: rough cut (boards → blanks) and final cut (blanks → parts).

## Consequences

- Waste % counts trims and blank kerfs as waste, which is honest about the cost of planing.
- Not jointly optimal. A joint solver is listed in the roadmap.
