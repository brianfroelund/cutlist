import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createProject, exampleProject, type Project } from './model';
import { encodeShare } from './serialize';
import { decodeCompact, encodeCompact, fromBase43, toBase43 } from './share';

const withoutIds = (p: Project) =>
  JSON.parse(JSON.stringify(p, (key, value) => (key === 'id' ? undefined : value)));

describe('base43', () => {
  it('round-trips any bytes using only QR alphanumeric, URL-safe characters', () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 200 }), (bytes) => {
        const text = toBase43(bytes);
        expect(text).toMatch(/^[0-9A-Z$*+\-./:]*$/);
        expect(fromBase43(text)).toEqual(bytes);
      }),
    );
  });

  it('rejects malformed text', () => {
    expect(fromBase43('A')).toBeNull();
    expect(fromBase43('ab')).toBeNull();
    expect(fromBase43(':::')).toBeNull();
  });
});

describe('compact share format', () => {
  const FORMAT2_FIXTURE =
    'N7MDDWP0DHWKEDF-0ZI29MARED$202MAKUDH6EHNIZ00KR0:N9Y41SDD1XHX+HE545.JQ257AXP43/$4G+C4BI:9GBB7S107N59JL2A0QTQKEC4MDBRCP10OAAO6FQ41XQQ453G92EV5LVH7UQTZO-6OFZLIG8/DI/92M7E0B0:D3+2CZ+3ZLD2E07U975BNZEIK3DZITG2120XY2GJCZ37..C3WCQHF9$97T2HLUHZ18D46I4M';

  it('decodes format 2 links for backward compatibility', () => {
    const decoded = decodeCompact(FORMAT2_FIXTURE);
    expect(decoded).not.toBeNull();
    expect(decoded!.name).toBe('Workbench');
    expect(decoded!.materials).toHaveLength(2);
    expect(decoded!.materials[0]!.kind).toBe('linear');
    expect(decoded!.materials[0]!.stock[0]!.length).toBe(24000);
    expect(decoded!.materials[0]!.parts[0]!.label).toBe('Leg');
  });

  it('round-trips a project (ids are regenerated)', () => {
    const project = exampleProject();
    project.units = 'in';
    project.materials[0]!.stock[0]!.quantity = 3;
    project.materials[0]!.parts[0]!.length = 8505;
    expect(withoutIds(decodeCompact(encodeCompact(project))!)).toEqual(withoutIds(project));
  });

  it('round-trips a project with sheet materials in format 3', () => {
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
      stock: [{ id: 's-sheet', length: 24400, width: 12200, quantity: 5 }],
      parts: [
        { id: 'p-1', label: 'Top', length: 12000, width: 6000, quantity: 1, grain: 'length' },
        { id: 'p-2', label: 'Side', length: 8000, width: 4000, quantity: 2, grain: 'width' },
        { id: 'p-3', label: 'Back', length: 5000, width: 5000, quantity: 1, grain: 'any' },
      ],
    });
    expect(withoutIds(decodeCompact(encodeCompact(project))!)).toEqual(withoutIds(project));
  });

  it('keeps unlimited stock and disabled planing', () => {
    const project = createProject();
    const decoded = decodeCompact(encodeCompact(project))!;
    expect(decoded.materials[0]!.stock[0]!.quantity).toBeNull();
    expect(decoded.materials[0]!.planingLength).toBeNull();
  });

  it('is much shorter than the original share format', () => {
    const project = exampleProject();
    expect(encodeCompact(project).length).toBeLessThan(encodeShare(project).length * 0.5);
  });

  it('returns null for garbage', () => {
    expect(decodeCompact('')).toBeNull();
    expect(decodeCompact('HELLO')).toBeNull();
    expect(decodeCompact(toBase43(new TextEncoder().encode('[9]')))).toBeNull();
  });
});
