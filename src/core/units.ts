import type { Length, UnitSystem } from './model';

export const DU_PER_MM = 10;
export const DU_PER_INCH = 254;

export function mm(value: number): Length {
  return Math.round(value * DU_PER_MM);
}

export function inches(value: number): Length {
  return Math.round(value * DU_PER_INCH);
}

const NUMBER = /^\d*\.?\d+$/;

function parseMetric(text: string): number | null {
  const match = text.replace(/\s+/g, '').match(/^([\d.,]+)(mm|cm|m)?$/);
  if (!match) return null;
  const raw = match[1]!.replace(',', '.');
  if (!NUMBER.test(raw)) return null;
  const factor = match[2] === 'm' ? 1000 : match[2] === 'cm' ? 10 : 1;
  return Number(raw) * factor;
}

function parseInchPart(text: string): number | null {
  const rest = text.replace(/(″|"|in(ches)?)$/, '').trim();
  if (!rest) return 0;
  if (NUMBER.test(rest)) return Number(rest);
  const mixed = rest.match(/^(?:(\d+(?:\.\d+)?)(?:\s+|\s*-\s*))?(\d+)\s*\/\s*(\d+)$/);
  if (!mixed) return null;
  const denominator = Number(mixed[3]);
  if (denominator === 0) return null;
  return Number(mixed[1] ?? 0) + Number(mixed[2]) / denominator;
}

function parseImperial(text: string): number | null {
  const feet = text.match(/^(\d+(?:\.\d+)?)\s*(?:'|′|ft)\s*-?\s*(.*)$/);
  if (!feet) return parseInchPart(text);
  const inchPart = parseInchPart(feet[2]!);
  return inchPart === null ? null : Number(feet[1]) * 12 + inchPart;
}

/** Parses user input ("1200", "1,2 m", "48 1/2", "4' 2\"") into a Length, or null if invalid. */
export function parseLength(input: string, units: UnitSystem): Length | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;
  if (units === 'mm') {
    const value = parseMetric(text);
    return value === null || !Number.isFinite(value) ? null : mm(value);
  }
  const value = parseImperial(text);
  return value === null || !Number.isFinite(value) ? null : inches(value);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Formats a Length without its unit: "1200.5" or "48 1/2" (nearest 1/16"). */
export function formatLength(length: Length, units: UnitSystem): string {
  if (units === 'mm') {
    const value = Math.round(length) / DU_PER_MM;
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  const sixteenths = Math.round((length / DU_PER_INCH) * 16);
  const whole = Math.floor(sixteenths / 16);
  const rest = sixteenths % 16;
  if (rest === 0) return String(whole);
  const divisor = gcd(rest, 16);
  const fraction = `${rest / divisor}/${16 / divisor}`;
  return whole === 0 ? fraction : `${whole} ${fraction}`;
}

export function formatWithUnit(length: Length, units: UnitSystem): string {
  return units === 'mm' ? `${formatLength(length, units)} mm` : `${formatLength(length, units)}″`;
}

/** Compact totals: metres for metric, feet for imperial. */
export function formatTotal(length: Length, units: UnitSystem): string {
  if (units === 'mm') return `${(length / DU_PER_MM / 1000).toFixed(2)} m`;
  return `${(length / DU_PER_INCH / 12).toFixed(1)} ft`;
}
