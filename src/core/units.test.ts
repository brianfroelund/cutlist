import { describe, expect, it } from 'vitest';
import { formatLength, formatTotal, inches, mm, parseLength } from './units';

describe('parseLength (mm)', () => {
  it.each([
    ['1200', 12000],
    ['1200.5', 12005],
    ['1200,5', 12005],
    [' 850 mm ', 8500],
    ['1.2m', 12000],
    ['120 cm', 12000],
    ['0', 0],
    ['1.200,5', 12005],
    ['1,200.5', 12005],
    ['1 200', 12000],
  ])('%s → %d', (input, expected) => expect(parseLength(input, 'mm')).toBe(expected));

  it.each(['', 'abc', '-5', '12..3', '1/2'])('rejects %j', (input) =>
    expect(parseLength(input, 'mm')).toBeNull(),
  );
});

describe('parseLength (in)', () => {
  it.each([
    ['48', inches(48)],
    ['48.5', inches(48.5)],
    ['48,5', inches(48.5)],
    ['48 1/2', inches(48.5)],
    ['48-1/2"', inches(48.5)],
    ['1/16', inches(1 / 16)],
    ["4'", inches(48)],
    ['4\' 2"', inches(50)],
    ['4ft 2 1/4', inches(50.25)],
  ])('%s → %d', (input, expected) => expect(parseLength(input, 'in')).toBe(expected));

  it.each(['', 'x', '1/0', '4 feet'])('rejects %j', (input) =>
    expect(parseLength(input, 'in')).toBeNull(),
  );
});

describe('formatLength', () => {
  it('formats millimetres', () => {
    expect(formatLength(mm(1200), 'mm')).toBe('1200');
    expect(formatLength(12005, 'mm')).toBe('1200.5');
  });

  it('formats inches to the nearest 1/16 and reduces fractions', () => {
    expect(formatLength(inches(48.5), 'in')).toBe('48 1/2');
    expect(formatLength(inches(0.0625), 'in')).toBe('1/16');
    expect(formatLength(inches(12), 'in')).toBe('12');
    expect(formatLength(mm(25), 'in')).toBe('1');
  });

  it('round-trips through parseLength', () => {
    for (const value of [1, 3, 850, 1234.5, 2400]) {
      expect(parseLength(formatLength(mm(value), 'mm'), 'mm')).toBe(mm(value));
    }
  });

  it('formats totals', () => {
    expect(formatTotal(mm(7200), 'mm')).toBe('7.20 m');
    expect(formatTotal(inches(96), 'in')).toBe('8.0 ft');
  });
});
