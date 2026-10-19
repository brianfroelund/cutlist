import type { Area, CutStyle, Length } from './model';
import type { Rect } from './rect';

export interface SheetItem {
  id: string;
  ref: string;
  label: string;
  /** Extent along length and width when unrotated. */
  w: Length;
  h: Length;
  rotatable: boolean;
}

export interface Placement<T extends SheetItem = SheetItem> {
  item: T;
  x: Length;
  y: Length;
  w: Length;
  h: Length;
  rotated: boolean;
}

export interface Cut {
  /** 1-based cut order within the sheet. */
  n: number;
  /** true = rip cut (parallel to sheet length/x axis, constant y); false = crosscut. */
  rip: boolean;
  x: Length;
  y: Length;
  span: Length;
  piece: Rect;
  at: Length;
}

export interface SheetLayout<T extends SheetItem = SheetItem> {
  stockId: string;
  length: Length;
  width: Length;
  edgeTrim: Length;
  placements: Placement<T>[];
  cuts: Cut[];
  largestOffcut: Rect | null;
  partArea: Area;
}

export interface Pack2DResult<T extends SheetItem = SheetItem> {
  sheets: SheetLayout<T>[];
  unplaced: T[];
}

export interface Pack2DOptions {
  attempts?: number;
  seed?: number;
  style: CutStyle;
  kerf: Length;
  edgeTrim: Length;
}
