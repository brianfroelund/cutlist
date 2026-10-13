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
  it('round-trips a project (ids are regenerated)', () => {
    const project = exampleProject();
    project.units = 'in';
    project.materials[0]!.stock[0]!.quantity = 3;
    project.materials[0]!.parts[0]!.length = 8505;
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
