import { describe, expect, it } from 'vitest';
import { createMaterial, createPart, createStock, createProject, exampleProject } from './model';
import { optimize, optimizeMaterial } from './optimize';
import { mm } from './units';
import { validateProject } from './validate';

describe('optimize', () => {
  it('handles several materials and aggregates totals', () => {
    const result = optimize(exampleProject());
    expect(result.materials).toHaveLength(3);
    expect(result.totals.linear).not.toBeNull();
    expect(result.totals.sheet).not.toBeNull();
    expect(result.totals.pieces).toBe(
      (result.totals.linear?.boards ?? 0) + (result.totals.sheet?.sheets ?? 0),
    );
    expect(result.materials.every((m) => m.unplaced.length === 0)).toBe(true);
    const m0 = result.materials[0]!;
    const m1 = result.materials[1]!;
    const m2 = result.materials[2]!;
    if (m0.kind === 'linear') expect(m0.blanks).toBeNull();
    if (m1.kind === 'linear') expect(m1.blanks).not.toBeNull();
    if (m2.kind === 'sheet') expect(m2.sheets.length).toBeGreaterThan(0);
  });

  it('reports out-of-stock and too-long parts separately for linear', () => {
    const m = createMaterial('Pine');
    m.stock = [createStock(mm(2400), 1)];
    m.parts = [createPart('Rail', mm(2000), 2), createPart('Beam', mm(3000), 1)];
    const result = optimizeMaterial(m, mm(3));
    expect(result.unplaced).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Rail', count: 1, reason: 'out-of-stock' }),
        expect.objectContaining({ label: 'Beam', count: 1, reason: 'too-long' }),
      ]),
    );
  });

  it('optimizes mixed project with linear and sheet materials', () => {
    const project = createProject();
    const sheetMat = createMaterial('Plywood', 'sheet');
    sheetMat.stock = [createStock(mm(2440), 1, mm(1220))];
    sheetMat.parts = [
      createPart('Top', mm(1200), 2, mm(600), 'length'),
      createPart('Extra', mm(2000), 1, mm(1500), 'length'), // too-large
      createPart('GrainBlocked', mm(1000), 1, mm(2000), 'length'), // grain
    ];
    project.materials.push(sheetMat);

    const result = optimize(project);
    expect(result.totals.linear).not.toBeNull();
    expect(result.totals.sheet).not.toBeNull();
    expect(result.totals.pieces).toBe(
      (result.totals.linear?.boards ?? 0) + (result.totals.sheet?.sheets ?? 0),
    );

    const sheetRes = result.materials.find((m) => m.kind === 'sheet')!;
    expect(sheetRes.unplaced).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Extra', reason: 'too-large' }),
        expect.objectContaining({ label: 'GrainBlocked', reason: 'grain' }),
      ]),
    );
  });

  it('reports out-of-stock for sheet materials when stock is limited', () => {
    const m = createMaterial('Plywood', 'sheet');
    m.stock = [createStock(mm(2440), 1, mm(1220))];
    m.parts = [createPart('Panel', mm(1200), 6, mm(600), 'any')];
    const project = createProject();
    project.materials = [m];
    const result = optimize(project);
    const sheetRes = result.materials[0]!;
    expect(sheetRes.unplaced).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Panel', count: 2, reason: 'out-of-stock' }),
      ]),
    );
  });

  it('builds a shopping list grouped by stock length', () => {
    const m = createMaterial('Pine');
    m.parts = [createPart('Rail', mm(2000), 3)];
    expect(optimizeMaterial(m, mm(3)).shopping).toEqual([
      expect.objectContaining({ length: mm(2400), count: 3 }),
    ]);
  });

  it('ignores empty rows', () => {
    const project = createProject();
    project.materials[0]!.parts = [createPart('', 0, 1)];
    expect(optimize(project).totals.pieces).toBe(0);
  });
});

describe('validateProject', () => {
  it('flags unusual settings', () => {
    const project = createProject();
    project.kerf = mm(25);
    const m = project.materials[0]!;
    m.stock = [];
    m.parts = [createPart('Leg', mm(500), 1)];
    m.planingLength = mm(30);
    m.trimPerEnd = mm(20);

    const sheet = createMaterial('Ply', 'sheet');
    sheet.stock = [createStock(mm(1000), 1, mm(1000))];
    sheet.edgeTrim = mm(600);
    sheet.parts = [createPart('P', mm(100), 1, mm(100))];
    project.materials.push(sheet);

    expect(validateProject(project).map((i) => i.code)).toEqual([
      'kerf-large',
      'no-stock',
      'planing-too-short',
      'edge-trim-too-large',
    ]);
  });
});
