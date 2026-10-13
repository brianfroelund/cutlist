import { mm } from './units';

/** Integer tenths of a millimetre. Every length in the app uses this unit internally. */
export type Length = number;
export type UnitSystem = 'mm' | 'in';

export interface StockItem {
  id: string;
  length: Length;
  /** null means unlimited. */
  quantity: number | null;
}

export interface Part {
  id: string;
  label: string;
  length: Length;
  quantity: number;
}

export interface Material {
  id: string;
  name: string;
  stock: StockItem[];
  parts: Part[];
  /** null disables the two-stage planing workflow. */
  planingLength: Length | null;
  /** Waste per blank end (snipe + squaring cut), kerf included. */
  trimPerEnd: Length;
}

export interface Project {
  version: typeof SCHEMA_VERSION;
  name: string;
  units: UnitSystem;
  kerf: Length;
  materials: Material[];
}

export const SCHEMA_VERSION = 1;
export const DEFAULT_PLANING_LENGTH = mm(1200);

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function createStock(length: Length = 0, quantity: number | null = null): StockItem {
  return { id: newId(), length, quantity };
}

export function createPart(label = '', length: Length = 0, quantity = 1): Part {
  return { id: newId(), label, length, quantity };
}

export function createMaterial(name: string): Material {
  return {
    id: newId(),
    name,
    stock: [createStock(mm(2400))],
    parts: [],
    planingLength: null,
    trimPerEnd: mm(20),
  };
}

export function createProject(): Project {
  return {
    version: SCHEMA_VERSION,
    name: 'My project',
    units: 'mm',
    kerf: mm(3),
    materials: [createMaterial('Pine 45×95')],
  };
}

export function exampleProject(): Project {
  const pine = createMaterial('Pine 45×95');
  pine.stock = [createStock(mm(2400)), createStock(mm(3000), 2)];
  pine.parts = [
    createPart('Leg', mm(850), 4),
    createPart('Long rail', mm(1600), 4),
    createPart('Short rail', mm(600), 4),
  ];
  const oak = createMaterial('Oak 26×160, rough');
  oak.stock = [createStock(mm(2100))];
  oak.parts = [createPart('Drawer front', mm(450), 4), createPart('Shelf', mm(550), 3)];
  oak.planingLength = mm(1200);
  oak.trimPerEnd = mm(15);
  return {
    version: SCHEMA_VERSION,
    name: 'Workbench',
    units: 'mm',
    kerf: mm(3),
    materials: [pine, oak],
  };
}

export function hasParts(project: Project): boolean {
  return project.materials.some((m) => m.parts.some((p) => p.length > 0 && p.quantity > 0));
}
