import { describe, expect, it } from 'vitest';
import { exampleProject } from './model';
import {
  decodeShare,
  encodeShare,
  fromJSON,
  parseProject,
  ProjectFormatError,
  toJSON,
} from './serialize';

describe('serialize', () => {
  it('round-trips JSON', () => {
    const project = exampleProject();
    expect(fromJSON(toJSON(project))).toEqual(project);
  });

  it('round-trips share links', () => {
    const project = exampleProject();
    const encoded = encodeShare(project);
    expect(encoded).toMatch(/^[\w+\-$]+$/);
    expect(decodeShare(encoded)).toEqual(project);
  });

  it('returns null for garbage share links', () => {
    expect(decodeShare('not-a-project')).toBeNull();
    expect(decodeShare('')).toBeNull();
  });

  it.each([
    ['non-object', 42],
    ['unknown version', { ...exampleProject(), version: 99 }],
    ['negative kerf', { ...exampleProject(), kerf: -1 }],
    ['fractional length', { ...exampleProject(), kerf: 1.5 }],
    ['materials not an array', { ...exampleProject(), materials: 'x' }],
    ['too many materials', { ...exampleProject(), materials: new Array(51).fill({}) }],
  ])('rejects %s', (_, data) => {
    expect(() => parseProject(data)).toThrow(ProjectFormatError);
  });

  it('sanitises ids and truncates long text', () => {
    const project = exampleProject();
    const data = JSON.parse(toJSON(project));
    data.name = 'x'.repeat(500);
    data.materials[0].id = '<img src=x onerror=alert(1)>';
    const parsed = parseProject(data);
    expect(parsed.name).toHaveLength(120);
    expect(parsed.materials[0]!.id).toMatch(/^[\w-]+$/);
  });

  it('migrates v1 project to v2 with default sheet fields', () => {
    const v1 = {
      version: 1,
      name: 'V1 Project',
      units: 'mm',
      kerf: 30,
      materials: [
        {
          id: 'mat-1',
          name: 'Pine',
          stock: [{ id: 's-1', length: 24000, quantity: null }],
          parts: [{ id: 'p-1', label: 'Leg', length: 8500, quantity: 4 }],
          planingLength: null,
          trimPerEnd: 200,
        },
      ],
    };
    const parsed = parseProject(v1);
    expect(parsed.version).toBe(2);
    expect(parsed.materials[0]!.kind).toBe('linear');
    expect(parsed.materials[0]!.grain).toBe(true);
    expect(parsed.materials[0]!.edgeTrim).toBe(0);
    expect(parsed.materials[0]!.cutStyle).toBe('guillotine');
    expect(parsed.materials[0]!.stock[0]!.width).toBe(0);
    expect(parsed.materials[0]!.parts[0]!.width).toBe(0);
    expect(parsed.materials[0]!.parts[0]!.grain).toBe('length');
  });

  it('round-trips a project with sheet material', () => {
    const project = exampleProject();
    project.materials.push({
      id: 'sheet-mat',
      name: 'Plywood',
      kind: 'sheet',
      grain: true,
      edgeTrim: 100,
      cutStyle: 'nested',
      planingLength: null,
      trimPerEnd: 0,
      stock: [{ id: 's-sheet', length: 24400, width: 12200, quantity: null }],
      parts: [
        { id: 'p-sheet', label: 'Panel', length: 12000, width: 6000, quantity: 2, grain: 'any' },
      ],
    });
    expect(fromJSON(toJSON(project))).toEqual(project);
  });

  it('rejects invalid JSON', () => {
    expect(() => fromJSON('{')).toThrow(ProjectFormatError);
  });
});
