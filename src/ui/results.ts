import type { Length, Material, Project, UnitSystem } from '../core/model';
import type { MaterialResult, OptimizeResult } from '../core/optimize';
import type { Bin, PackItem } from '../core/pack';
import { isBlank, type Blank } from '../core/planing';
import { formatTotal, formatWithUnit } from '../core/units';
import { validateProject, type Issue } from '../core/validate';
import { copy } from './copy';
import { captureRects, playFlip } from './delight/flip';
import { h } from './dom';
import { sawhorse } from './icons';

export interface ResultsContext {
  onExample(): void;
}

const PATTERNS = 8;

interface Segment {
  kind: 'piece' | 'blank' | 'kerf' | 'trim';
  offset: Length;
  length: Length;
  title?: string;
  primary?: string;
  secondary?: string;
  pattern?: number;
  flip?: string;
}

interface View {
  units: UnitSystem;
  kerf: Length;
  patterns: Map<string, number>;
  materialId: string;
}

const pct = (value: number, total: number) => `${((value / total) * 100).toFixed(3)}%`;

export function renderResults(
  root: HTMLElement,
  result: OptimizeResult,
  project: Project,
  ctx: ResultsContext,
): void {
  const before = captureRects(root);
  const issues = validateProject(project);
  const shown = result.materials.filter((mr) => mr.boards.length > 0 || mr.unplaced.length > 0);
  root.replaceChildren(
    ...(shown.length === 0
      ? [emptyState(ctx)]
      : [
          printHeader(project),
          summary(result, shown, project, issues),
          partsList(project),
          ...shown.map((mr) =>
            materialView(
              mr,
              project.materials.find((m) => m.id === mr.materialId)!,
              project,
              issues,
            ),
          ),
          h('p', { class: 'print-only print-footer' }, 'cutlist · measure twice, cut once'),
        ]),
  );
  playFlip(root, before);
}

function emptyState(ctx: ResultsContext) {
  return h(
    'div',
    { class: 'card empty' },
    sawhorse(),
    h('h2', {}, copy.emptyTitle),
    h('p', {}, copy.emptyBody),
    h('button', { type: 'button', class: 'btn', onClick: ctx.onExample }, copy.loadExample),
  );
}

function printHeader(project: Project) {
  const date = new Date().toLocaleDateString(undefined, { dateStyle: 'long' });
  return h(
    'header',
    { class: 'print-only print-header' },
    h('h1', {}, project.name || 'Cutlist'),
    h('p', {}, `${date} · kerf ${formatWithUnit(project.kerf, project.units)}`),
  );
}

function summary(
  result: OptimizeResult,
  shown: MaterialResult[],
  project: Project,
  issues: Issue[],
) {
  const { totals } = result;
  const unplaced = result.materials.reduce(
    (s, m) => s + m.unplaced.reduce((n, u) => n + u.count, 0),
    0,
  );
  const stat = (value: string, label: string, testid?: string) =>
    h(
      'div',
      { class: 'stat' },
      h('span', { class: 'stat-value', 'data-testid': testid }, value),
      h('span', { class: 'stat-label' }, label),
    );
  return h(
    'section',
    { class: 'card summary', 'aria-label': 'Summary' },
    h(
      'div',
      { class: 'stats' },
      stat(String(totals.boards), copy.boards(totals.boards), 'total-boards'),
      stat(formatTotal(totals.stockLength, project.units), 'of stock'),
      stat(`${totals.wastePct}%`, 'waste', 'total-waste'),
    ),
    h(
      'p',
      { class: 'verdict' },
      unplaced ? copy.unplacedVerdict(unplaced) : copy.wasteVerdict(totals.wastePct),
    ),
    issues.some((i) => i.code === 'kerf-large') && h('p', { class: 'issue' }, copy.kerfLarge),
    h(
      'ul',
      { class: 'shopping' },
      shown.map((mr) =>
        h(
          'li',
          {},
          h('span', { class: 'shopping-name' }, mr.name || 'Material'),
          h(
            'span',
            { class: 'shopping-items' },
            mr.shopping
              .map((s) => `${s.count} × ${formatWithUnit(s.length, project.units)}`)
              .join(', ') || '—',
          ),
        ),
      ),
    ),
  );
}

function partsList(project: Project) {
  const fmt = (l: Length) => formatWithUnit(l, project.units);
  const materials = project.materials
    .map((m) => ({
      material: m,
      parts: m.parts
        .map((p, i) => ({ part: p, pattern: i % PATTERNS }))
        .filter(({ part }) => part.length > 0 && part.quantity > 0),
    }))
    .filter((m) => m.parts.length > 0);
  return h(
    'section',
    { class: 'print-only parts-list', 'aria-label': 'Parts list' },
    h('h2', {}, 'Parts list'),
    materials.map(({ material, parts }) =>
      h(
        'table',
        {},
        h(
          'caption',
          {},
          material.name || 'Material',
          material.planingLength !== null &&
            ` · planed in blanks ≤ ${fmt(material.planingLength)}, trim ${fmt(material.trimPerEnd)} per end`,
        ),
        h(
          'thead',
          {},
          h(
            'tr',
            {},
            h('th', {}, ''),
            h('th', {}, 'Part'),
            h('th', {}, 'Length'),
            h('th', {}, 'Qty'),
          ),
        ),
        h(
          'tbody',
          {},
          parts.map(({ part, pattern }) =>
            h(
              'tr',
              {},
              h('td', {}, h('span', { class: 'swatch', 'data-pattern': pattern })),
              h('td', {}, part.label.trim() || 'Part'),
              h('td', { class: 'num' }, fmt(part.length)),
              h('td', { class: 'num' }, part.quantity),
            ),
          ),
        ),
        h(
          'tfoot',
          {},
          h(
            'tr',
            {},
            h('td', {}, ''),
            h('td', {}, 'Total'),
            h(
              'td',
              { class: 'num' },
              formatTotal(
                parts.reduce((sum, { part }) => sum + part.length * part.quantity, 0),
                project.units,
              ),
            ),
            h(
              'td',
              { class: 'num' },
              parts.reduce((sum, { part }) => sum + part.quantity, 0),
            ),
          ),
        ),
      ),
    ),
  );
}

function materialView(mr: MaterialResult, material: Material, project: Project, issues: Issue[]) {
  const view: View = {
    units: project.units,
    kerf: project.kerf,
    patterns: new Map(material.parts.map((p, i) => [p.id, i % PATTERNS])),
    materialId: mr.materialId,
  };
  const longest = material.stock.reduce((max, s) => Math.max(max, s.length), 0);
  const fmt = (l: Length) => formatWithUnit(l, project.units);

  const messages = [
    ...issues
      .filter((i) => i.materialId === mr.materialId)
      .map((i) => (i.code === 'no-stock' ? copy.noStock : copy.planingTooShort)),
    ...mr.unplaced.map((u) =>
      u.reason === 'too-long'
        ? copy.tooLong(u.label, fmt(u.length), fmt(longest))
        : u.reason === 'no-stock'
          ? copy.noStock
          : copy.outOfStock(u.count, u.label),
    ),
  ];

  const boards = mr.boards.map((bin, i) => boardView(bin, i, view));
  const stats = `${mr.stats.boards} ${copy.boards(mr.stats.boards)} · ${mr.stats.wastePct}% waste`;

  return h(
    'section',
    { class: 'card result', 'aria-label': mr.name },
    h(
      'header',
      { class: 'result-head' },
      h('h2', {}, mr.name || 'Material'),
      h('span', { class: 'muted' }, stats),
    ),
    [...new Set(messages)].map((m) => h('p', { class: 'issue', role: 'note' }, m)),
    mr.blanks
      ? [
          h('h3', { class: 'step' }, h('span', { class: 'step-no' }, '1'), copy.stepRough),
          boards,
          h('h3', { class: 'step' }, h('span', { class: 'step-no' }, '2'), copy.stepPlane),
          mr.blanks.map((blank) => blankView(blank, view)),
        ]
      : boards,
  );
}

function boardView(bin: Bin<PackItem | Blank>, index: number, view: View) {
  const fmt = (l: Length) => formatWithUnit(l, view.units);
  const segments: Segment[] = [];
  for (const placed of bin.items) {
    const item = placed.item;
    const blank = isBlank(item);
    segments.push({
      kind: blank ? 'blank' : 'piece',
      offset: placed.offset,
      length: item.length,
      title: `${item.label} · ${fmt(item.length)}`,
      primary: blank ? item.label : fmt(item.length),
      secondary: blank ? fmt(item.length) : item.label,
      pattern: blank ? undefined : view.patterns.get(item.ref),
      flip: `${view.materialId}:${item.id}`,
    });
    pushKerf(segments, placed.offset + item.length, bin.stockLength, view.kerf);
  }
  return h(
    'div',
    { class: 'board', 'data-testid': 'board' },
    h(
      'div',
      { class: 'board-head' },
      h('span', {}, h('strong', {}, `#${index + 1}`), ` · ${fmt(bin.stockLength)}`),
      bin.offcut > 0 && h('span', { class: 'muted' }, `${copy.offcut} ${fmt(bin.offcut)}`),
    ),
    bar(bin.stockLength, segments, `Board ${index + 1}, ${fmt(bin.stockLength)}`),
    cutList(
      bin.items.map((p) =>
        isBlank(p.item)
          ? {
              key: p.item.id,
              text: `${p.item.label} · ${fmt(p.item.length)}`,
              detail: blankContents(p.item, view),
            }
          : {
              key: `${p.item.length}:${p.item.label}`,
              text: fmt(p.item.length),
              detail: p.item.label,
              pattern: view.patterns.get(p.item.ref),
            },
      ),
    ),
  );
}

function blankContents(blank: Blank, view: View): string {
  return blank.parts
    .map((p) => `${p.item.label} ${formatWithUnit(p.item.length, view.units)}`)
    .join(' + ');
}

function blankView(blank: Blank, view: View) {
  const fmt = (l: Length) => formatWithUnit(l, view.units);
  const segments: Segment[] = [];
  if (blank.trimPerEnd > 0)
    segments.push({ kind: 'trim', offset: 0, length: blank.trimPerEnd, title: 'Trim' });
  for (const placed of blank.parts) {
    segments.push({
      kind: 'piece',
      offset: placed.offset,
      length: placed.item.length,
      title: `${placed.item.label} · ${fmt(placed.item.length)}`,
      primary: fmt(placed.item.length),
      secondary: placed.item.label,
      pattern: view.patterns.get(placed.item.ref),
    });
    pushKerf(
      segments,
      placed.offset + placed.item.length,
      blank.length - blank.trimPerEnd,
      view.kerf,
    );
  }
  if (blank.trimPerEnd > 0) {
    segments.push({
      kind: 'trim',
      offset: blank.length - blank.trimPerEnd,
      length: blank.trimPerEnd,
      title: 'Trim',
    });
  }
  return h(
    'div',
    { class: 'board blank-board' },
    h(
      'div',
      { class: 'board-head' },
      h('span', {}, h('strong', {}, blank.label), ` · ${fmt(blank.length)}`),
      blank.oversize && h('span', { class: 'flag' }, copy.oversize),
    ),
    bar(blank.length, segments, `Blank ${blank.label}, ${fmt(blank.length)}`),
    cutList(
      blank.parts.map((p) => ({
        key: `${p.item.length}:${p.item.label}`,
        text: fmt(p.item.length),
        detail: p.item.label,
        pattern: view.patterns.get(p.item.ref),
      })),
    ),
  );
}

function pushKerf(segments: Segment[], at: Length, end: Length, kerf: Length) {
  if (kerf > 0 && at < end)
    segments.push({ kind: 'kerf', offset: at, length: Math.min(kerf, end - at) });
}

function bar(total: Length, segments: Segment[], label: string) {
  return h(
    'div',
    { class: 'bar', role: 'img', 'aria-label': label },
    segments.map((s) => {
      const el = h(
        'div',
        {
          class: `seg seg-${s.kind}`,
          title: s.title,
          'data-flip': s.flip,
          'data-pattern': s.pattern,
        },
        s.primary && h('span', { class: 'seg-primary' }, s.primary),
        s.secondary && h('span', { class: 'seg-secondary' }, s.secondary),
      );
      el.style.left = pct(s.offset, total);
      el.style.width = pct(s.length, total);
      return el;
    }),
  );
}

interface CutLine {
  key: string;
  text: string;
  detail: string;
  pattern?: number;
}

/** Consecutive identical cuts collapse into "3 × 700 mm Leg"; checkboxes let you tick cuts off in the shop. */
function cutList(lines: CutLine[]) {
  const grouped: (CutLine & { count: number })[] = [];
  for (const line of lines) {
    const last = grouped[grouped.length - 1];
    if (last && last.key === line.key) last.count++;
    else grouped.push({ ...line, count: 1 });
  }
  return h(
    'ul',
    { class: 'cuts' },
    grouped.map((g) =>
      h(
        'li',
        {},
        h(
          'label',
          { class: 'cut' },
          h('input', { type: 'checkbox' }),
          g.pattern !== undefined &&
            h('span', { class: 'swatch', 'data-pattern': g.pattern, 'aria-hidden': 'true' }),
          h('span', { class: 'cut-text' }, g.count > 1 ? `${g.count} × ${g.text}` : g.text),
          h('span', { class: 'cut-detail' }, g.detail),
        ),
      ),
    ),
  );
}
