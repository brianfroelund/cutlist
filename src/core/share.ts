import { compressToUint8Array, decompressFromUint8Array } from 'lz-string';
import { newId, SCHEMA_VERSION, type Project } from './model';
import { parseProject } from './serialize';

/**
 * Compact share format ("#Q…"), built to keep share links and QR codes small:
 * positional arrays instead of JSON keys, no ids, lengths in mm, lz-compressed bytes,
 * then base-43 text that QR codes store in their dense alphanumeric mode.
 */
const FORMAT = 3;
const UNLIMITED = -1;

/** QR alphanumeric characters minus space and %, so the text is also URL-fragment safe. */
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$*+-./:';
const BASE = ALPHABET.length;

const toMm = (du: number) => du / 10;
const toDu = (mm: unknown) => (typeof mm === 'number' ? Math.round(mm * 10) : NaN);

const grainToNum = (g: string) => (g === 'width' ? 1 : g === 'any' ? 2 : 0);
const numToGrain = (n: unknown) => (n === 1 ? 'width' : n === 2 ? 'any' : 'length');

export function packProject(project: Project): unknown[] {
  return [
    FORMAT,
    project.name,
    project.units === 'in' ? 1 : 0,
    toMm(project.kerf),
    project.materials.map((m) => [
      m.name,
      m.planingLength === null ? 0 : toMm(m.planingLength),
      toMm(m.trimPerEnd),
      m.stock.map((s) => [toMm(s.length), s.quantity ?? UNLIMITED, toMm(s.width)]),
      m.parts.map((p) => [p.label, toMm(p.length), p.quantity, toMm(p.width), grainToNum(p.grain)]),
      m.kind === 'sheet' ? 1 : 0,
      m.grain ? 1 : 0,
      toMm(m.edgeTrim),
      m.cutStyle === 'nested' ? 1 : 0,
    ]),
  ];
}

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Rebuilds a full document and runs it through the regular validator. */
export function unpackProject(data: unknown): Project {
  const [format, name, units, kerf, materials] = list(data);
  if (format !== 2 && format !== FORMAT) throw new Error('Unknown share format');
  return parseProject({
    version: SCHEMA_VERSION,
    name,
    units: units === 1 ? 'in' : 'mm',
    kerf: toDu(kerf),
    materials: list(materials).map((m) => {
      const [mName, planing, trim, stock, parts, kind, grain, edgeTrim, cutStyle] = list(m);
      return {
        id: newId(),
        name: mName,
        kind: kind === 1 ? 'sheet' : 'linear',
        grain: grain === undefined ? true : grain === 1,
        edgeTrim: edgeTrim === undefined ? 0 : toDu(edgeTrim),
        cutStyle: cutStyle === 1 ? 'nested' : 'guillotine',
        planingLength: planing === 0 ? null : toDu(planing),
        trimPerEnd: toDu(trim),
        stock: list(stock).map((s) => {
          const [length, quantity, width] = list(s);
          return {
            id: newId(),
            length: toDu(length),
            quantity: quantity === UNLIMITED ? null : quantity,
            width: width === undefined ? 0 : toDu(width),
          };
        }),
        parts: list(parts).map((p) => {
          const [label, length, quantity, width, pGrain] = list(p);
          return {
            id: newId(),
            label,
            length: toDu(length),
            quantity,
            width: width === undefined ? 0 : toDu(width),
            grain: numToGrain(pGrain),
          };
        }),
      };
    }),
  });
}

/** Two bytes become three characters (65536 < 43³); a trailing byte becomes two. */
export function toBase43(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 2) {
    if (i + 1 < bytes.length) {
      let n = bytes[i]! * 256 + bytes[i + 1]!;
      const c = n % BASE;
      n = (n - c) / BASE;
      out += ALPHABET[n % BASE]! + ALPHABET[Math.floor(n / BASE)]! + ALPHABET[c]!;
    } else {
      const n = bytes[i]!;
      out += ALPHABET[n % BASE]! + ALPHABET[Math.floor(n / BASE)]!;
    }
  }
  return out;
}

export function fromBase43(text: string): Uint8Array | null {
  if (text.length % 3 === 1) return null;
  const digits = [...text].map((ch) => ALPHABET.indexOf(ch));
  if (digits.some((d) => d < 0)) return null;
  const bytes: number[] = [];
  for (let i = 0; i < digits.length; i += 3) {
    if (i + 2 < digits.length) {
      const n = (digits[i]! + digits[i + 1]! * BASE) * BASE + digits[i + 2]!;
      if (n > 0xffff) return null;
      bytes.push(n >> 8, n & 0xff);
    } else {
      const n = digits[i]! + digits[i + 1]! * BASE;
      if (n > 0xff) return null;
      bytes.push(n);
    }
  }
  return Uint8Array.from(bytes);
}

export function encodeCompact(project: Project): string {
  return toBase43(compressToUint8Array(JSON.stringify(packProject(project))));
}

export function decodeCompact(text: string): Project | null {
  try {
    const bytes = fromBase43(text);
    const json = bytes && decompressFromUint8Array(bytes);
    return json ? unpackProject(JSON.parse(json)) : null;
  } catch {
    return null;
  }
}
