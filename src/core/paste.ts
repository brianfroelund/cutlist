import type { Length, UnitSystem } from './model';
import { parseLength } from './units';

export interface PastedPart {
  label: string;
  length: Length;
  quantity: number;
}

export interface PasteResult {
  parts: PastedPart[];
  /** Rows that had content but could not be read (a header row is not counted). */
  skipped: number;
}

const MAX_ROWS = 500;
const MAX_QUANTITY = 1000;
const QUANTITY = /^[x×]?\s*(\d+)\s*(?:[x×]|pcs\.?|stk\.?|st\.?|stück)?$/i;

/** Splits one line, honouring "quoted, cells" as spreadsheets export them. */
function splitRow(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell.trim() === '') {
      quoted = true;
      cell = '';
    } else if (ch === delimiter) {
      cells.push(cell.trim());
      cell = '';
    } else cell += ch;
  }
  cells.push(cell.trim());
  return cells;
}

/** Tabs (copied cells) win; then semicolons; commas only when the text clearly is CSV, so "850,5" stays a decimal. */
function detectDelimiter(lines: string[]): string | null {
  if (lines.some((l) => l.includes('\t'))) return '\t';
  if (lines.some((l) => l.includes(';'))) return ';';
  const csv = lines.some((l) => {
    const cells = splitRow(l, ',');
    return cells.length >= 3 || (cells.length === 2 && !/^[\d\s.]*$/.test(cells[0]!));
  });
  return csv ? ',' : null;
}

function quantity(text: string | undefined): number | null {
  if (!text) return 1;
  const match = text.trim().match(QUANTITY);
  const n = match ? Number(match[1]) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= MAX_QUANTITY ? n : null;
}

/** Columns are name, length, quantity; "length, quantity" and a single length column also work. */
function readRow(cells: string[], units: UnitSystem): PastedPart | null {
  let label = '';
  let lengthText: string | undefined;
  let qtyText: string | undefined;
  if (cells.length >= 3) [label, lengthText, qtyText] = cells as [string, string, string];
  else if (cells.length === 2) {
    if (parseLength(cells[0]!, units) !== null) [lengthText, qtyText] = cells;
    else [label, lengthText] = cells as [string, string];
  } else lengthText = cells[0];

  const length = lengthText ? parseLength(lengthText, units) : null;
  const qty = quantity(qtyText);
  if (length === null || length <= 0 || qty === null) return null;
  return { label: label.slice(0, 120), length, quantity: qty };
}

export function looksLikeTable(text: string): boolean {
  const trimmed = text.replace(/[\r\n]+$/, '');
  return trimmed.includes('\t') || /[\r\n]/.test(trimmed);
}

export function parsePastedParts(text: string, units: UnitSystem): PasteResult {
  const lines = text
    .split(/\r\n|\n|\r/)
    .filter((l) => l.replace(/[\t,;\s]/g, '') !== '')
    .slice(0, MAX_ROWS + 1);
  const delimiter = detectDelimiter(lines);
  const parts: PastedPart[] = [];
  let skipped = 0;
  lines.forEach((line, index) => {
    const cells = delimiter ? splitRow(line, delimiter) : [line.trim()];
    const part = readRow(cells, units);
    if (part) parts.push(part);
    else if (index > 0) skipped++;
  });
  return { parts: parts.slice(0, MAX_ROWS), skipped };
}

export interface PastedSheetPart {
  label: string;
  length: Length;
  width: Length;
  quantity: number;
}

export interface PasteSheetResult {
  parts: PastedSheetPart[];
  skipped: number;
}

/** Columns: name, length, width, quantity.
 * 3 cells: if cell 0 parses as length -> length, width, qty; else name, length, width (qty 1).
 * 2 cells: length, width (qty 1).
 */
function readSheetRow(cells: string[], units: UnitSystem): PastedSheetPart | null {
  let label = '';
  let lengthText: string | undefined;
  let widthText: string | undefined;
  let qtyText: string | undefined;

  if (cells.length >= 4) {
    [label, lengthText, widthText, qtyText] = cells as [string, string, string, string];
  } else if (cells.length === 3) {
    if (parseLength(cells[0]!, units) !== null) {
      [lengthText, widthText, qtyText] = cells as [string, string, string];
    } else {
      [label, lengthText, widthText] = cells as [string, string, string];
    }
  } else if (cells.length === 2) {
    [lengthText, widthText] = cells as [string, string];
  } else {
    return null;
  }

  const length = lengthText ? parseLength(lengthText, units) : null;
  const width = widthText ? parseLength(widthText, units) : null;
  const qty = quantity(qtyText);

  if (length === null || length <= 0 || width === null || width <= 0 || qty === null) {
    return null;
  }

  return { label: label.slice(0, 120), length, width, quantity: qty };
}

export function parsePastedSheetParts(text: string, units: UnitSystem): PasteSheetResult {
  const lines = text
    .split(/\r\n|\n|\r/)
    .filter((l) => l.replace(/[\t,;\s]/g, '') !== '')
    .slice(0, MAX_ROWS + 1);
  const delimiter = detectDelimiter(lines);
  const parts: PastedSheetPart[] = [];
  let skipped = 0;
  lines.forEach((line, index) => {
    const cells = delimiter ? splitRow(line, delimiter) : [line.trim()];
    const part = readSheetRow(cells, units);
    if (part) parts.push(part);
    else if (index > 0) skipped++;
  });
  return { parts: parts.slice(0, MAX_ROWS), skipped };
}
