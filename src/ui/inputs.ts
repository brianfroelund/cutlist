import {
  createMaterial,
  createPart,
  createStock,
  DEFAULT_PLANING_LENGTH,
  type Material,
  type Part,
  type Project,
  type StockItem,
  type UnitSystem,
} from '../core/model';
import { copy } from './copy';
import { attachSwipe } from './delight/swipe';
import { h } from './dom';
import { countField, lengthField, moneyField, textField } from './fields';
import { icon } from './icons';
import type { ChangeOptions, Store } from './store';

export interface InputsContext {
  store: Store;
  onRemoved(what: string, snapshot: Project): void;
  onFocusMaterial(id: string): void;
}

export function renderInputs(root: HTMLElement, ctx: InputsContext, focus?: string): void {
  const project = ctx.store.get();
  root.replaceChildren(
    settingsCard(project, ctx),
    ...project.materials.map((m) => materialCard(m, project.units, ctx)),
    h(
      'button',
      { type: 'button', class: 'btn btn-dashed', onClick: () => addMaterial(ctx.store) },
      icon('plus'),
      'Add material',
    ),
  );
  if (focus) root.querySelector<HTMLElement>(`[data-focus="${CSS.escape(focus)}"]`)?.focus();
}

export function addMaterial(store: Store): void {
  const material = createMaterial(`Material ${store.get().materials.length + 1}`);
  store.change((p) => p.materials.push(material), {
    structure: true,
    focus: `${material.id}:name`,
  });
}

export function addPart(store: Store, materialId: string): void {
  const part = createPart();
  store.change((p) => p.materials.find((m) => m.id === materialId)?.parts.push(part), {
    structure: true,
    focus: `${part.id}:label`,
  });
}

function settingsCard(project: Project, ctx: InputsContext) {
  const unit = (value: UnitSystem, label: string) =>
    h(
      'button',
      {
        type: 'button',
        role: 'radio',
        class: 'seg-btn',
        'aria-checked': String(project.units === value),
        onClick: () => {
          if (project.units !== value)
            ctx.store.change((p) => (p.units = value), { structure: true });
        },
      },
      label,
    );
  return h(
    'section',
    { class: 'card settings', 'aria-label': 'Project settings' },
    h(
      'div',
      { class: 'settings-grid' },
      h(
        'div',
        { class: 'field' },
        h('span', { class: 'field-label', id: 'units-label' }, 'Units'),
        h(
          'div',
          { class: 'segmented', role: 'radiogroup', 'aria-labelledby': 'units-label' },
          unit('mm', 'mm'),
          unit('in', 'inches'),
        ),
      ),
      lengthField({
        label: 'Saw kerf',
        value: project.kerf,
        units: project.units,
        allowZero: true,
        focus: 'kerf',
        onCommit: (v) => ctx.store.change((p) => (p.kerf = v ?? 0)),
      }),
    ),
    h('p', { class: 'hint' }, copy.kerfHint),
  );
}

function materialCard(m: Material, units: UnitSystem, ctx: InputsContext) {
  const currentMaterial = () => ctx.store.get().materials.find((x) => x.id === m.id);
  const edit = (fn: (target: Material) => void, options: ChangeOptions = {}) =>
    ctx.store.change((p) => {
      const target = p.materials.find((x) => x.id === m.id);
      if (target) fn(target);
    }, options);
  const remove = (what: string, fn: (target: Material) => void) => {
    const snapshot = ctx.store.get();
    edit(fn, { structure: true });
    ctx.onRemoved(what, snapshot);
  };

  const addStock = () => {
    const stock = createStock();
    edit((t) => t.stock.push(stock), { structure: true, focus: `${stock.id}:length` });
  };

  const stockRow = (s: StockItem) =>
    row(
      'stock',
      [
        lengthField({
          label: 'Length',
          value: s.length || null,
          units,
          focus: `${s.id}:length`,
          onCommit: (v) => edit((t) => withRow(t.stock, s.id, (x) => (x.length = v ?? 0))),
        }),
        countField({
          label: 'Qty',
          value: s.quantity,
          placeholder: '∞',
          focus: `${s.id}:qty`,
          onCommit: (v) => edit((t) => withRow(t.stock, s.id, (x) => (x.quantity = v))),
        }),
        moneyField({
          label: 'Price',
          value: s.cost,
          placeholder: '—',
          focus: `${s.id}:cost`,
          onCommit: (v) => edit((t) => withRow(t.stock, s.id, (x) => (x.cost = v))),
        }),
      ],
      'board length',
      () => remove('a board length', (t) => (t.stock = t.stock.filter((x) => x.id !== s.id))),
      addStock,
    );

  const partRow = (part: Part) =>
    row(
      'part',
      [
        textField({
          label: 'Part',
          value: part.label,
          placeholder: 'e.g. Leg',
          focus: `${part.id}:label`,
          onCommit: (v) => edit((t) => withRow(t.parts, part.id, (x) => (x.label = v))),
        }),
        lengthField({
          label: 'Length',
          value: part.length || null,
          units,
          focus: `${part.id}:length`,
          onCommit: (v) => edit((t) => withRow(t.parts, part.id, (x) => (x.length = v ?? 0))),
        }),
        countField({
          label: 'Qty',
          value: part.quantity,
          focus: `${part.id}:qty`,
          onCommit: (v) => edit((t) => withRow(t.parts, part.id, (x) => (x.quantity = v ?? 0))),
        }),
      ],
      'part',
      () => {
        const label = currentMaterial()?.parts.find((x) => x.id === part.id)?.label;
        remove(label ? `“${label}”` : 'a part', (t) => {
          t.parts = t.parts.filter((x) => x.id !== part.id);
        });
      },
      () => addPart(ctx.store, m.id),
    );

  const planing = m.planingLength !== null;

  return h(
    'article',
    {
      class: 'card material',
      'data-material': m.id,
      'data-testid': 'material',
      onFocusin: () => ctx.onFocusMaterial(m.id),
    },
    h(
      'header',
      { class: 'material-head' },
      h('input', {
        class: 'material-name',
        value: m.name,
        maxlength: 120,
        'aria-label': 'Material name',
        'data-focus': `${m.id}:name`,
        onInput: (e: Event) => edit((t) => (t.name = (e.target as HTMLInputElement).value)),
      }),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn-ghost btn-icon',
          'aria-label': 'Remove material',
          onClick: () => {
            const snapshot = ctx.store.get();
            const name = currentMaterial()?.name;
            ctx.store.change((p) => (p.materials = p.materials.filter((x) => x.id !== m.id)), {
              structure: true,
            });
            ctx.onRemoved(name ? `“${name}”` : 'the material', snapshot);
          },
        },
        icon('x'),
      ),
    ),
    section(
      'Stock',
      copy.stockHint,
      'stock',
      ['Length', 'Qty', 'Price'],
      m.stock.map(stockRow),
      'Add board length',
      addStock,
    ),
    section(
      'Parts',
      copy.partsHint,
      'part',
      ['Part', 'Length', 'Qty'],
      m.parts.map(partRow),
      'Add part',
      () => addPart(ctx.store, m.id),
    ),
    h(
      'div',
      { class: 'planing' },
      h(
        'label',
        { class: 'switch' },
        h('input', {
          type: 'checkbox',
          checked: planing,
          onChange: () =>
            edit((t) => (t.planingLength = planing ? null : DEFAULT_PLANING_LENGTH), {
              structure: true,
              focus: planing ? undefined : `${m.id}:planing`,
            }),
        }),
        h('span', {}, copy.planingToggle),
      ),
      planing &&
        h(
          'div',
          { class: 'planing-fields' },
          lengthField({
            label: 'Planing length',
            value: m.planingLength,
            units,
            focus: `${m.id}:planing`,
            onCommit: (v) => {
              if (v !== null) edit((t) => (t.planingLength = v));
            },
          }),
          lengthField({
            label: 'Trim per end',
            value: m.trimPerEnd,
            units,
            allowZero: true,
            focus: `${m.id}:trim`,
            onCommit: (v) => edit((t) => (t.trimPerEnd = v ?? 0)),
          }),
        ),
      planing && h('p', { class: 'hint' }, copy.planingHint),
    ),
  );
}

function withRow<T extends { id: string }>(rows: T[], id: string, fn: (row: T) => void) {
  const target = rows.find((r) => r.id === id);
  if (target) fn(target);
}

function section(
  title: string,
  hint: string,
  kind: 'stock' | 'part',
  columns: string[],
  rows: HTMLElement[],
  addLabel: string,
  onAdd: () => void,
) {
  return h(
    'section',
    { class: 'rows-section' },
    h('h3', { class: 'section-title' }, title, ' ', h('small', {}, hint)),
    rows.length > 0 &&
      h(
        'div',
        { class: `row-head ${kind}-grid`, 'aria-hidden': 'true' },
        columns.map((c) => h('span', {}, c)),
      ),
    h('div', { class: 'rows' }, rows),
    h('button', { type: 'button', class: 'btn btn-add', onClick: onAdd }, icon('plus'), addLabel),
  );
}

function row(
  kind: 'stock' | 'part',
  fields: HTMLElement[],
  name: string,
  onRemove: () => void,
  onEnterLast: () => void,
) {
  const el = h(
    'div',
    { class: `row ${kind}-grid`, 'data-testid': `${kind}-row` },
    fields,
    h(
      'button',
      {
        type: 'button',
        class: 'btn btn-ghost btn-icon remove',
        'aria-label': `Remove ${name}`,
        onClick: onRemove,
      },
      icon('x'),
    ),
  );
  const wrap = h('div', { class: 'swipe' }, el);
  attachSwipe(wrap, el, onRemove);
  // Enter moves down a row, or adds a new one from the last row — spreadsheet style.
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !(e.target instanceof HTMLInputElement)) return;
    e.preventDefault();
    const field = e.target.dataset.focus?.split(':')[1];
    const next = wrap.nextElementSibling?.querySelector<HTMLInputElement>(
      `[data-focus$=":${field}"]`,
    );
    if (next) next.focus();
    else onEnterLast();
  });
  return wrap;
}
