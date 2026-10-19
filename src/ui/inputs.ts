import {
  createMaterial,
  createPart,
  createSheetStock,
  createStock,
  DEFAULT_PLANING_LENGTH,
  DEFAULT_SHEET_WIDTH,
  type CutStyle,
  type Material,
  type MaterialKind,
  type Part,
  type Project,
  type StockItem,
  type UnitSystem,
} from '../core/model';
import { looksLikeTable, parsePastedParts, parsePastedSheetParts } from '../core/paste';
import { attachSwipe } from './delight/swipe';
import { h } from './dom';
import { countField, lengthField, selectField, textField } from './fields';
import { copy } from './i18n';
import { icon } from './icons';
import type { ChangeOptions, Store } from './store';

export interface InputsContext {
  store: Store;
  onRemoved(what: string, snapshot: Project): void;
  onFocusMaterial(id: string): void;
  onPasted(added: number, skipped: number, snapshot: Project, kind?: MaterialKind): void;
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
      copy.addMaterial,
    ),
  );
  if (focus) root.querySelector<HTMLElement>(`[data-focus="${CSS.escape(focus)}"]`)?.focus();
}

export function addMaterial(store: Store): void {
  const material = createMaterial(copy.newMaterialName(store.get().materials.length + 1));
  store.change((p) => p.materials.push(material), {
    structure: true,
    focus: `${material.id}:name`,
  });
}

export function addPart(store: Store, materialId: string): void {
  const material = store.get().materials.find((m) => m.id === materialId);
  if (!material) return;
  const emptyPart = material.parts.find(
    (p) => !p.label.trim() && p.length === 0 && (p.width === undefined || p.width === 0),
  );
  if (emptyPart) {
    store.change(() => {}, { structure: false, focus: `${emptyPart.id}:label` });
    return;
  }
  const part = material.kind === 'sheet' ? createPart('', 0, 1, 0, 'any') : createPart();
  store.change((p) => p.materials.find((m) => m.id === materialId)?.parts.push(part), {
    structure: true,
    focus: `${part.id}:label`,
  });
}

/** Adds pasted spreadsheet rows to a material; an empty row at `atPartId` is replaced. */
export function pasteParts(
  ctx: InputsContext,
  materialId: string,
  text: string,
  atPartId?: string,
) {
  const snapshot = ctx.store.get();
  const material = snapshot.materials.find((m) => m.id === materialId);
  if (!material) return;

  if (material.kind === 'sheet') {
    const { parts, skipped } = parsePastedSheetParts(text, snapshot.units);
    if (parts.length === 0) {
      ctx.onPasted(0, skipped, snapshot, 'sheet');
      return;
    }
    const created = parts.map((p) => createPart(p.label, p.length, p.quantity, p.width, 'any'));
    ctx.store.change(
      (p) => {
        const target = p.materials.find((x) => x.id === materialId);
        if (!target) return;
        const index = target.parts.findIndex((x) => x.id === atPartId);
        const at = target.parts[index];
        const replace =
          at !== undefined &&
          !at.label.trim() &&
          at.length === 0 &&
          (at.width === undefined || at.width === 0);
        if (index < 0) {
          const onlyEmpty =
            target.parts.length === 1 &&
            !target.parts[0]!.label.trim() &&
            target.parts[0]!.length === 0 &&
            (target.parts[0]!.width === undefined || target.parts[0]!.width === 0);
          if (onlyEmpty) target.parts = [...created];
          else target.parts.push(...created);
        } else {
          target.parts.splice(replace ? index : index + 1, replace ? 1 : 0, ...created);
        }
      },
      { structure: true, focus: `${created[created.length - 1]!.id}:label` },
    );
    ctx.onPasted(created.length, skipped, snapshot, 'sheet');
  } else {
    const { parts, skipped } = parsePastedParts(text, snapshot.units);
    if (parts.length === 0) {
      ctx.onPasted(0, skipped, snapshot, 'linear');
      return;
    }
    const created = parts.map((p) => createPart(p.label, p.length, p.quantity));
    ctx.store.change(
      (p) => {
        const target = p.materials.find((x) => x.id === materialId);
        if (!target) return;
        const index = target.parts.findIndex((x) => x.id === atPartId);
        const at = target.parts[index];
        const replace = at !== undefined && !at.label.trim() && at.length === 0;
        if (index < 0) {
          const onlyEmpty =
            target.parts.length === 1 &&
            !target.parts[0]!.label.trim() &&
            target.parts[0]!.length === 0;
          if (onlyEmpty) target.parts = [...created];
          else target.parts.push(...created);
        } else {
          target.parts.splice(replace ? index : index + 1, replace ? 1 : 0, ...created);
        }
      },
      { structure: true, focus: `${created[created.length - 1]!.id}:label` },
    );
    ctx.onPasted(created.length, skipped, snapshot, 'linear');
  }
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
    { class: 'card settings', 'aria-label': copy.settings },
    h(
      'div',
      { class: 'settings-grid' },
      h(
        'div',
        { class: 'field' },
        h('span', { class: 'field-label', id: 'units-label' }, copy.units),
        h(
          'div',
          { class: 'segmented', role: 'radiogroup', 'aria-labelledby': 'units-label' },
          unit('mm', 'mm'),
          unit('in', copy.inches),
        ),
      ),
      lengthField({
        label: copy.kerf,
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

  const kindBtn = (value: MaterialKind, label: string) =>
    h(
      'button',
      {
        type: 'button',
        role: 'radio',
        class: 'seg-btn',
        'aria-checked': String(m.kind === value),
        onClick: () => {
          if (m.kind !== value) {
            edit(
              (t) => {
                t.kind = value;
                if (value === 'sheet') {
                  for (const s of t.stock) {
                    if (!s.width) s.width = DEFAULT_SHEET_WIDTH;
                  }
                  for (const p of t.parts) {
                    if (!p.width)
                      p.width = Math.min(p.length || DEFAULT_SHEET_WIDTH, DEFAULT_SHEET_WIDTH);
                    if (!p.grain) p.grain = 'any';
                  }
                  if (t.edgeTrim === undefined) t.edgeTrim = 0;
                  if (!t.cutStyle) t.cutStyle = 'guillotine';
                }
              },
              { structure: true },
            );
          }
        },
      },
      label,
    );

  const addStock = () => {
    const stock = createStock();
    edit((t) => t.stock.push(stock), { structure: true, focus: `${stock.id}:length` });
  };

  const addSheetStock = () => {
    const stock = createSheetStock();
    edit((t) => t.stock.push(stock), { structure: true, focus: `${stock.id}:length` });
  };

  const stockRow = (s: StockItem) =>
    row(
      'stock',
      [
        lengthField({
          label: copy.length,
          value: s.length || null,
          units,
          focus: `${s.id}:length`,
          onCommit: (v) => edit((t) => withRow(t.stock, s.id, (x) => (x.length = v ?? 0))),
        }),
        countField({
          label: copy.qty,
          value: s.quantity,
          placeholder: '∞',
          title: copy.stockQtyUnlimited,
          focus: `${s.id}:qty`,
          onCommit: (v) => edit((t) => withRow(t.stock, s.id, (x) => (x.quantity = v))),
        }),
      ],
      copy.removeBoard,
      () => remove(copy.aBoardLength, (t) => (t.stock = t.stock.filter((x) => x.id !== s.id))),
      addStock,
    );

  const sheetStockRow = (s: StockItem) =>
    row(
      'sheetstock',
      [
        lengthField({
          label: copy.length,
          value: s.length || null,
          units,
          focus: `${s.id}:length`,
          onCommit: (v) => edit((t) => withRow(t.stock, s.id, (x) => (x.length = v ?? 0))),
        }),
        lengthField({
          label: copy.width,
          value: s.width || null,
          units,
          focus: `${s.id}:width`,
          onCommit: (v) => edit((t) => withRow(t.stock, s.id, (x) => (x.width = v ?? 0))),
        }),
        countField({
          label: copy.qty,
          value: s.quantity,
          placeholder: '∞',
          title: copy.stockQtyUnlimited,
          focus: `${s.id}:qty`,
          onCommit: (v) => edit((t) => withRow(t.stock, s.id, (x) => (x.quantity = v))),
        }),
      ],
      copy.removeSheet,
      () => remove(copy.aSheetSize, (t) => (t.stock = t.stock.filter((x) => x.id !== s.id))),
      addSheetStock,
    );

  const partRow = (part: Part) => {
    const el = row(
      'part',
      [
        textField({
          label: copy.part,
          value: part.label,
          placeholder: copy.partPlaceholder,
          focus: `${part.id}:label`,
          onCommit: (v) => edit((t) => withRow(t.parts, part.id, (x) => (x.label = v))),
        }),
        lengthField({
          label: copy.length,
          value: part.length || null,
          units,
          focus: `${part.id}:length`,
          onCommit: (v) => edit((t) => withRow(t.parts, part.id, (x) => (x.length = v ?? 0))),
        }),
        countField({
          label: copy.qty,
          value: part.quantity,
          focus: `${part.id}:qty`,
          onCommit: (v) => edit((t) => withRow(t.parts, part.id, (x) => (x.quantity = v ?? 0))),
        }),
      ],
      copy.removePart,
      () => {
        const label = currentMaterial()?.parts.find((x) => x.id === part.id)?.label;
        remove(label ? `“${label}”` : copy.aPart, (t) => {
          t.parts = t.parts.filter((x) => x.id !== part.id);
        });
      },
      () => addPart(ctx.store, m.id),
      part.id,
    );
    // A single value pastes normally; rows or columns become new parts.
    el.addEventListener('paste', (e) => {
      const text = e.clipboardData?.getData('text/plain');
      if (!text || !looksLikeTable(text)) return;
      e.preventDefault();
      e.stopPropagation();
      pasteParts(ctx, m.id, text, part.id);
    });
    return el;
  };

  const sheetPartRow = (part: Part) => {
    const el = row(
      'sheetpart',
      [
        textField({
          label: copy.part,
          value: part.label,
          placeholder: copy.partPlaceholder,
          focus: `${part.id}:label`,
          onCommit: (v) => edit((t) => withRow(t.parts, part.id, (x) => (x.label = v))),
        }),
        lengthField({
          label: copy.length,
          value: part.length || null,
          units,
          focus: `${part.id}:length`,
          onCommit: (v) => edit((t) => withRow(t.parts, part.id, (x) => (x.length = v ?? 0))),
        }),
        lengthField({
          label: copy.width,
          value: part.width || null,
          units,
          focus: `${part.id}:width`,
          onCommit: (v) => edit((t) => withRow(t.parts, part.id, (x) => (x.width = v ?? 0))),
        }),
        countField({
          label: copy.qty,
          value: part.quantity,
          focus: `${part.id}:qty`,
          onCommit: (v) => edit((t) => withRow(t.parts, part.id, (x) => (x.quantity = v ?? 0))),
        }),
        selectField({
          label: copy.grain,
          value: part.grain ?? 'any',
          className: 'field-grain',
          options: [
            { value: 'any', label: copy.grainNone, title: copy.grainAny },
            { value: 'length', label: '⟷', title: copy.grainLength },
            { value: 'width', label: '↕', title: copy.grainWidth },
          ],
          focus: `${part.id}:grain`,
          onCommit: (v) => edit((t) => withRow(t.parts, part.id, (x) => (x.grain = v))),
        }),
      ],
      copy.removePart,
      () => {
        const label = currentMaterial()?.parts.find((x) => x.id === part.id)?.label;
        remove(label ? `“${label}”` : copy.aPart, (t) => {
          t.parts = t.parts.filter((x) => x.id !== part.id);
        });
      },
      () => addPart(ctx.store, m.id),
      part.id,
    );
    el.addEventListener('paste', (e) => {
      const text = e.clipboardData?.getData('text/plain');
      if (!text || !looksLikeTable(text)) return;
      e.preventDefault();
      e.stopPropagation();
      pasteParts(ctx, m.id, text, part.id);
    });
    return el;
  };

  const cutStyleBtn = (style: CutStyle, label: string) =>
    h(
      'button',
      {
        type: 'button',
        role: 'radio',
        class: 'seg-btn',
        'aria-checked': String(m.cutStyle === style),
        onClick: () => edit((t) => (t.cutStyle = style)),
      },
      label,
    );

  const planing = m.planingLength !== null;

  const stockSection =
    m.kind === 'sheet'
      ? section(
          copy.stock,
          copy.sheetStockHint,
          'sheetstock',
          [copy.length, copy.width, copy.qty],
          m.stock.map(sheetStockRow),
          copy.addSheet,
          addSheetStock,
        )
      : section(
          copy.stock,
          copy.stockHint,
          'stock',
          [copy.length, copy.qty],
          m.stock.map(stockRow),
          copy.addBoard,
          addStock,
        );

  const partsSection =
    m.kind === 'sheet'
      ? section(
          copy.parts,
          copy.partsHint,
          'sheetpart',
          [copy.part, copy.length, copy.width, copy.qty, copy.grain],
          m.parts.map(sheetPartRow),
          copy.addPart,
          () => addPart(ctx.store, m.id),
          copy.pasteHintSheet,
        )
      : section(
          copy.parts,
          copy.partsHint,
          'part',
          [copy.part, copy.length, copy.qty],
          m.parts.map(partRow),
          copy.addPart,
          () => addPart(ctx.store, m.id),
          copy.pasteHint,
        );

  const optionsSection =
    m.kind === 'sheet'
      ? h(
          'div',
          { class: 'sheet-options' },
          h(
            'div',
            { class: 'sheet-options-fields' },
            lengthField({
              label: copy.edgeTrim,
              value: m.edgeTrim,
              units,
              allowZero: true,
              focus: `${m.id}:edgeTrim`,
              onCommit: (v) => edit((t) => (t.edgeTrim = v ?? 0)),
            }),
            h(
              'div',
              { class: 'field' },
              h('span', { class: 'field-label', id: `${m.id}-cutstyle` }, copy.cutStyle),
              h(
                'div',
                { class: 'segmented', role: 'radiogroup', 'aria-labelledby': `${m.id}-cutstyle` },
                cutStyleBtn('guillotine', copy.cutGuillotine),
                cutStyleBtn('nested', copy.cutNested),
              ),
            ),
          ),
          h('p', { class: 'hint' }, copy.edgeTrimHint),
        )
      : h(
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
                label: copy.planingLength,
                value: m.planingLength,
                units,
                focus: `${m.id}:planing`,
                onCommit: (v) => {
                  if (v !== null) edit((t) => (t.planingLength = v));
                },
              }),
              lengthField({
                label: copy.trimPerEnd,
                value: m.trimPerEnd,
                units,
                allowZero: true,
                focus: `${m.id}:trim`,
                onCommit: (v) => edit((t) => (t.trimPerEnd = v ?? 0)),
              }),
            ),
          planing && h('p', { class: 'hint' }, copy.planingHint),
        );

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
        'aria-label': copy.materialName,
        'data-focus': `${m.id}:name`,
        onInput: (e: Event) => edit((t) => (t.name = (e.target as HTMLInputElement).value)),
      }),
      h(
        'div',
        { class: 'segmented material-kind', role: 'radiogroup', 'aria-label': copy.materialKind },
        kindBtn('linear', copy.kindBoards),
        kindBtn('sheet', copy.kindSheets),
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn-ghost btn-icon',
          'aria-label': copy.removeMaterial,
          onClick: () => {
            const snapshot = ctx.store.get();
            const name = currentMaterial()?.name;
            ctx.store.change((p) => (p.materials = p.materials.filter((x) => x.id !== m.id)), {
              structure: true,
            });
            ctx.onRemoved(name ? `“${name}”` : copy.theMaterial, snapshot);
          },
        },
        icon('x'),
      ),
    ),
    stockSection,
    partsSection,
    optionsSection,
  );
}

function withRow<T extends { id: string }>(rows: T[], id: string, fn: (row: T) => void) {
  const target = rows.find((r) => r.id === id);
  if (target) fn(target);
}

function section(
  title: string,
  hint: string,
  kind: 'stock' | 'part' | 'sheetstock' | 'sheetpart',
  columns: string[],
  rows: HTMLElement[],
  addLabel: string,
  onAdd: () => void,
  footnote?: string,
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
    footnote && h('p', { class: 'hint paste-hint' }, footnote),
  );
}

function row(
  kind: 'stock' | 'part' | 'sheetstock' | 'sheetpart',
  fields: HTMLElement[],
  removeLabel: string,
  onRemove: () => void,
  onEnterLast: () => void,
  partId?: string,
) {
  const el = h(
    'div',
    {
      class: `row ${kind}-grid`,
      'data-testid': kind.includes('stock') ? 'stock-row' : 'part-row',
      ...(partId ? { 'data-part-id': partId } : {}),
    },
    fields,
    h(
      'button',
      {
        type: 'button',
        class: 'btn btn-ghost btn-icon remove',
        'aria-label': removeLabel,
        onClick: onRemove,
      },
      icon('x'),
    ),
  );
  const wrap = h('div', { class: 'swipe' }, el);
  attachSwipe(wrap, el, onRemove);
  // Enter moves down a row, or adds a new one from the last row — spreadsheet style.
  el.addEventListener('keydown', (e) => {
    if (
      e.key !== 'Enter' ||
      !(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)
    )
      return;
    e.preventDefault();
    const field = e.target.dataset.focus?.split(':')[1];
    const next = wrap.nextElementSibling?.querySelector<HTMLElement>(`[data-focus$=":${field}"]`);
    if (next) next.focus();
    else onEnterLast();
  });
  return wrap;
}
