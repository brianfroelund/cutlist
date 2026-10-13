import type { Length, UnitSystem } from '../core/model';
import { formatLength, parseLength } from '../core/units';
import { h } from './dom';

type Parsed<T> = { ok: true; value: T } | { ok: false };

interface FieldOptions<T> {
  label: string;
  value: T;
  onCommit(value: T): void;
  focus?: string;
  placeholder?: string;
  className?: string;
}

function field(label: string, input: HTMLInputElement, className = '', suffix?: string) {
  return h(
    'label',
    { class: `field ${className}` },
    h('span', { class: 'field-label' }, label),
    h(
      'span',
      { class: 'input-wrap' },
      input,
      suffix ? h('span', { class: 'suffix', 'aria-hidden': 'true' }, suffix) : null,
    ),
  );
}

function bind<T>(
  input: HTMLInputElement,
  parse: (raw: string) => Parsed<T>,
  onCommit: (value: T) => void,
  format?: (value: T) => string,
) {
  input.addEventListener('input', () => {
    const result = parse(input.value);
    input.setAttribute('aria-invalid', String(!result.ok));
    if (result.ok) onCommit(result.value);
  });
  if (format) {
    input.addEventListener('change', () => {
      const result = parse(input.value);
      if (result.ok) input.value = format(result.value);
    });
  }
}

const baseInput = (o: FieldOptions<unknown>, value: string, inputmode: string) =>
  h('input', {
    type: 'text',
    inputmode,
    autocomplete: 'off',
    spellcheck: 'false',
    enterkeyhint: 'next',
    value,
    placeholder: o.placeholder,
    'data-focus': o.focus,
  });

/** Empty input commits null; callers decide what null means. */
export function lengthField(
  o: FieldOptions<Length | null> & { units: UnitSystem; allowZero?: boolean },
) {
  const format = (v: Length | null) => (v === null ? '' : formatLength(v, o.units));
  const input = baseInput(o, format(o.value), o.units === 'mm' ? 'decimal' : 'text');
  bind(
    input,
    (raw) => {
      if (!raw.trim()) return { ok: true, value: null };
      const v = parseLength(raw, o.units);
      return v !== null && (v > 0 || (o.allowZero && v === 0))
        ? { ok: true, value: v }
        : { ok: false };
    },
    o.onCommit,
    format,
  );
  return field(o.label, input, o.className, o.units === 'mm' ? 'mm' : 'in');
}

export function countField(o: FieldOptions<number | null>) {
  const input = baseInput(o, o.value === null ? '' : String(o.value), 'numeric');
  bind(
    input,
    (raw) => {
      const text = raw.trim();
      if (!text) return { ok: true, value: null };
      const n = Number(text);
      return /^\d+$/.test(text) && n >= 1 && n <= 1000 ? { ok: true, value: n } : { ok: false };
    },
    o.onCommit,
  );
  return field(o.label, input, o.className);
}

export function moneyField(o: FieldOptions<number | null>) {
  const input = baseInput(o, o.value === null ? '' : String(o.value), 'decimal');
  bind(
    input,
    (raw) => {
      const text = raw.trim().replace(',', '.');
      if (!text) return { ok: true, value: null };
      return /^\d+(\.\d{1,2})?$/.test(text) ? { ok: true, value: Number(text) } : { ok: false };
    },
    o.onCommit,
  );
  return field(o.label, input, o.className);
}

export function textField(o: FieldOptions<string>) {
  const input = baseInput(o, o.value, 'text');
  input.maxLength = 120;
  input.setAttribute('spellcheck', 'true');
  input.addEventListener('input', () => o.onCommit(input.value));
  return field(o.label, input, o.className);
}
