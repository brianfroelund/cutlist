import { inches, mm } from './units';

/** Integer tenths of a millimetre. Every length in the app uses this unit internally. */
export type Length = number;
export type UnitSystem = 'mm' | 'in';
export type MaterialKind = 'linear' | 'sheet';
export type CutStyle = 'guillotine' | 'nested';
/** Which part dimension must follow the sheet grain; 'any' lets the optimizer rotate it. */
export type PartGrain = 'length' | 'width' | 'any';
/** Square tenths of a millimetre. */
export type Area = number;

export interface StockItem {
  id: string;
  length: Length;
  /** null means unlimited. */
  quantity: number | null;
  /** Sheet width (0 for linear). */
  width: Length;
}

export interface Part {
  id: string;
  label: string;
  length: Length;
  quantity: number;
  /** Sheet width (0 for linear). */
  width: Length;
  /** Sheet grain orientation constraint. */
  grain: PartGrain;
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
  kind: MaterialKind;
  /** Sheets only: grain runs along the sheet length. */
  grain: boolean;
  /** Sheets only: removed from every edge of each sheet, kerf included. */
  edgeTrim: Length;
  cutStyle: CutStyle;
}

export interface Project {
  version: typeof SCHEMA_VERSION;
  name: string;
  units: UnitSystem;
  kerf: Length;
  materials: Material[];
}

export const SCHEMA_VERSION = 2;
export const DEFAULT_PLANING_LENGTH = mm(2200);
export const DEFAULT_SHEET_LENGTH = mm(2440);
export const DEFAULT_SHEET_WIDTH = mm(1220);

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function createStock(
  length: Length = 0,
  quantity: number | null = null,
  width: Length = 0,
): StockItem {
  return { id: newId(), length, quantity, width };
}

export function createSheetStock(units: UnitSystem = 'mm'): StockItem {
  return units === 'mm'
    ? createStock(mm(2440), null, mm(1220))
    : createStock(inches(96), null, inches(48));
}

export function createPart(
  label = '',
  length: Length = 0,
  quantity = 1,
  width: Length = 0,
  grain: PartGrain = 'any',
): Part {
  return { id: newId(), label, length, quantity, width, grain };
}

export function createMaterial(
  name: string,
  kind: MaterialKind = 'linear',
  units: UnitSystem = 'mm',
): Material {
  return {
    id: newId(),
    name,
    kind,
    stock: kind === 'sheet' ? [createSheetStock(units)] : [createStock(mm(2400))],
    parts: [kind === 'sheet' ? createPart('', 0, 1, 0, 'any') : createPart()],
    planingLength: null,
    trimPerEnd: mm(20),
    grain: true,
    edgeTrim: 0,
    cutStyle: 'guillotine',
  };
}

export function createProject(name = 'My project', materialName = 'Pine 45×95'): Project {
  return {
    version: SCHEMA_VERSION,
    name,
    units: 'mm',
    kerf: mm(3),
    materials: [createMaterial(materialName)],
  };
}

export const EXAMPLE_NAMES = {
  project: 'Workbench',
  pine: 'Pine 45×95',
  oak: 'Oak 26×160, rough',
  plywood: 'Birch plywood 18 mm',
  leg: 'Leg',
  longRail: 'Long rail',
  shortRail: 'Short rail',
  drawerFront: 'Drawer front',
  shelf: 'Shelf',
  lowerShelf: 'Lower shelf',
  drawerSide: 'Drawer side',
  drawerBottom: 'Drawer bottom',
};

export function exampleProject(names: Partial<typeof EXAMPLE_NAMES> = EXAMPLE_NAMES): Project {
  const allNames = { ...EXAMPLE_NAMES, ...names };
  const pine = createMaterial(allNames.pine);
  pine.stock = [createStock(mm(2400)), createStock(mm(3000), 2)];
  pine.parts = [
    createPart(allNames.leg, mm(850), 4),
    createPart(allNames.longRail, mm(1600), 4),
    createPart(allNames.shortRail, mm(600), 4),
  ];
  const oak = createMaterial(allNames.oak);
  oak.stock = [createStock(mm(2100))];
  oak.parts = [
    createPart(allNames.drawerFront, mm(450), 4),
    createPart(allNames.shelf, mm(550), 3),
  ];
  oak.planingLength = mm(1200);
  oak.trimPerEnd = mm(15);
  const plywood = createMaterial(allNames.plywood, 'sheet');
  plywood.stock = [createSheetStock('mm')];
  plywood.grain = true;
  plywood.edgeTrim = mm(10);
  plywood.parts = [
    createPart(allNames.lowerShelf, mm(1500), 1, mm(500), 'length'),
    createPart(allNames.drawerBottom, mm(450), 4, mm(400), 'any'),
  ];
  return {
    version: SCHEMA_VERSION,
    name: allNames.project,
    units: 'mm',
    kerf: mm(3),
    materials: [pine, oak, plywood],
  };
}

export function hasParts(project: Project): boolean {
  return project.materials.some((m) =>
    m.parts.some((p) => p.length > 0 && p.quantity > 0 && (m.kind === 'linear' || p.width > 0)),
  );
}
