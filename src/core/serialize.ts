import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import {
  newId,
  SCHEMA_VERSION,
  type Material,
  type Part,
  type Project,
  type StockItem,
} from './model';

export class ProjectFormatError extends Error {}

// Limits keep untrusted files and share links from freezing the optimizer.
const MAX_TEXT = 120;
const MAX_ROWS = 500;
const MAX_MATERIALS = 50;
const MAX_LENGTH = 10_000_000;
const MAX_QUANTITY = 1000;

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const text = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v.slice(0, MAX_TEXT) : fallback;

const id = (v: unknown): string => (typeof v === 'string' && /^[\w-]{1,40}$/.test(v) ? v : newId());

function length(v: unknown, field: string, allowZero = false): number {
  if (
    typeof v !== 'number' ||
    !Number.isInteger(v) ||
    v < 0 ||
    v > MAX_LENGTH ||
    (!allowZero && v === 0)
  ) {
    throw new ProjectFormatError(`Invalid ${field}`);
  }
  return v;
}

function quantity(v: unknown, field: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > MAX_QUANTITY) {
    throw new ProjectFormatError(`Invalid ${field}`);
  }
  return v;
}

function list<T>(v: unknown, max: number, field: string, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(v) || v.length > max) throw new ProjectFormatError(`Invalid ${field}`);
  return v.map(parse);
}

function parseStock(v: unknown): StockItem {
  if (!isObject(v)) throw new ProjectFormatError('Invalid stock');
  return {
    id: id(v.id),
    length: length(v.length, 'stock length', true),
    quantity: v.quantity === null ? null : quantity(v.quantity, 'stock quantity'),
    cost: cost(v.cost),
  };
}

function cost(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0)
    throw new ProjectFormatError('Invalid cost');
  return v;
}

function parsePart(v: unknown): Part {
  if (!isObject(v)) throw new ProjectFormatError('Invalid part');
  return {
    id: id(v.id),
    label: text(v.label),
    length: length(v.length, 'part length', true),
    quantity: quantity(v.quantity, 'part quantity'),
  };
}

function parseMaterial(v: unknown): Material {
  if (!isObject(v)) throw new ProjectFormatError('Invalid material');
  return {
    id: id(v.id),
    name: text(v.name, 'Material'),
    stock: list(v.stock, MAX_ROWS, 'stock', parseStock),
    parts: list(v.parts, MAX_ROWS, 'parts', parsePart),
    planingLength: v.planingLength === null ? null : length(v.planingLength, 'planing length'),
    trimPerEnd: length(v.trimPerEnd, 'trim', true),
  };
}

/** Upgrades older documents to the current schema. Add a step here when SCHEMA_VERSION changes. */
function migrate(data: Json): Json {
  if (data.version === SCHEMA_VERSION) return data;
  throw new ProjectFormatError(`Unsupported project version: ${String(data.version)}`);
}

/** Validates untrusted input (files, share links, localStorage) into a Project. */
export function parseProject(data: unknown): Project {
  if (!isObject(data)) throw new ProjectFormatError('Not a cutlist project');
  const doc = migrate(data);
  return {
    version: SCHEMA_VERSION,
    name: text(doc.name, 'Untitled project'),
    units: doc.units === 'in' ? 'in' : 'mm',
    kerf: length(doc.kerf, 'kerf', true),
    materials: list(doc.materials, MAX_MATERIALS, 'materials', parseMaterial),
  };
}

export function toJSON(project: Project): string {
  return JSON.stringify(project, null, 2);
}

export function fromJSON(json: string): Project {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new ProjectFormatError('Not valid JSON');
  }
  return parseProject(data);
}

export function encodeShare(project: Project): string {
  return compressToEncodedURIComponent(JSON.stringify(project));
}

export function decodeShare(encoded: string): Project | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    return json ? fromJSON(json) : null;
  } catch {
    return null;
  }
}
