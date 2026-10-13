import { describe, expect, it } from 'vitest';
import { looksLikeTable, parsePastedParts } from './paste';
import { inches, mm } from './units';

describe('parsePastedParts', () => {
  it('reads tab-separated rows copied from a spreadsheet', () => {
    const text = 'Leg\t850\t4\nRail\t1600\t2\n';
    expect(parsePastedParts(text, 'mm')).toEqual({
      parts: [
        { label: 'Leg', length: mm(850), quantity: 4 },
        { label: 'Rail', length: mm(1600), quantity: 2 },
      ],
      skipped: 0,
    });
  });

  it('skips a header row without counting it', () => {
    const result = parsePastedParts('Name\tLength\tQty\nLeg\t850\t4', 'mm');
    expect(result.parts).toHaveLength(1);
    expect(result.skipped).toBe(0);
  });

  it('accepts semicolon CSV with decimal commas (Danish Excel)', () => {
    const result = parsePastedParts('Hylde;550,5;3\r\nBen;1.200,5;4', 'mm');
    expect(result.parts).toEqual([
      { label: 'Hylde', length: mm(550.5), quantity: 3 },
      { label: 'Ben', length: mm(1200.5), quantity: 4 },
    ]);
  });

  it('accepts comma CSV with quoted names', () => {
    const result = parsePastedParts('"Rail, long",1600,2\nShelf,550,3', 'mm');
    expect(result.parts.map((p) => p.label)).toEqual(['Rail, long', 'Shelf']);
  });

  it('treats a single column as lengths and "850,5" as a decimal', () => {
    expect(parsePastedParts('850\n850,5\n600', 'mm').parts.map((p) => p.length)).toEqual([
      mm(850),
      mm(850.5),
      mm(600),
    ]);
  });

  it('reads two columns as name + length or length + quantity', () => {
    expect(parsePastedParts('Leg\t850', 'mm').parts[0]).toEqual({
      label: 'Leg',
      length: mm(850),
      quantity: 1,
    });
    expect(parsePastedParts('850\t4', 'mm').parts[0]).toEqual({
      label: '',
      length: mm(850),
      quantity: 4,
    });
  });

  it('understands inches, feet and quantity suffixes', () => {
    const result = parsePastedParts('Leg\t29 1/2"\t4 pcs\nTop\t4\' 2"\tx2', 'in');
    expect(result.parts).toEqual([
      { label: 'Leg', length: inches(29.5), quantity: 4 },
      { label: 'Top', length: inches(50), quantity: 2 },
    ]);
  });

  it('counts unreadable rows as skipped', () => {
    const result = parsePastedParts('Leg\t850\t4\nOops\tabc\t2\nShelf\t550\t-1', 'mm');
    expect(result.parts).toHaveLength(1);
    expect(result.skipped).toBe(2);
  });

  it('ignores blank lines and empty cells at the end', () => {
    expect(parsePastedParts('\nLeg\t850\t4\t\t\n\n\t\t\n', 'mm').parts).toHaveLength(1);
  });
});

describe('looksLikeTable', () => {
  it('ignores a single copied cell with a trailing newline', () => {
    expect(looksLikeTable('850\n')).toBe(false);
    expect(looksLikeTable('850')).toBe(false);
  });

  it('detects rows and columns', () => {
    expect(looksLikeTable('Leg\t850')).toBe(true);
    expect(looksLikeTable('850\n600')).toBe(true);
  });
});
