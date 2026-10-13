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

  it('rejects invalid JSON', () => {
    expect(() => fromJSON('{')).toThrow(ProjectFormatError);
  });
});
