import { describe, expect, it } from 'vitest';
import { createMaterial, createPart, createStock, createProject, exampleProject } from './model';
import { optimize, optimizeMaterial } from './optimize';
import { mm } from './units';
import { validateProject } from './validate';

describe('optimize', () => {
  it('handles several materials and aggregates totals', () => {
    const result = optimize(exampleProject());
    expect(result.materials).toHaveLength(2);
    expect(result.totals.boards).toBe(result.materials.reduce((s, m) => s + m.stats.boards, 0));
    expect(result.materials.every((m) => m.unplaced.length === 0)).toBe(true);
    expect(result.materials[0]!.blanks).toBeNull();
    expect(result.materials[1]!.blanks).not.toBeNull();
  });

  it('reports out-of-stock and too-long parts separately', () => {
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

  it('computes cost only when stock is priced', () => {
    const m = createMaterial('Pine');
    m.parts = [createPart('Leg', mm(800), 2)];
    expect(optimizeMaterial(m, mm(3)).stats.cost).toBeNull();
    m.stock[0]!.cost = 12.5;
    expect(optimizeMaterial(m, mm(3)).stats.cost).toBe(12.5);
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
    expect(optimize(project).totals.boards).toBe(0);
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
    expect(validateProject(project).map((i) => i.code)).toEqual([
      'kerf-large',
      'no-stock',
      'planing-too-short',
    ]);
  });
});
