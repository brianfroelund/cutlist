import {
  createProject,
  exampleProject,
  hasParts,
  type MaterialKind,
  type Project,
} from '../core/model';
import type { OptimizeResult } from '../core/optimize';
import { copy, isLocaleCode, LANGUAGES, locale, setLocale } from './i18n';
import { setFaviconBusy } from './delight/favicon';
import { sawdustBurst } from './delight/sawdust';
import { installBlade } from './delight/blade';
import { h, isTyping } from './dom';
import { icon, type IconName } from './icons';
import { addMaterial, addPart, pasteParts, renderInputs } from './inputs';
import { OptimizerClient } from './optimizer-client';
import {
  downloadProject,
  loadLocal,
  readProjectFile,
  saveLocal,
  shareUrl,
  splitShareUrl,
  takeSharedProject,
} from './persistence';
import { renderResults } from './results';
import { qrSvg } from './qr';
import { Store } from './store';
import { mountToasts, toast } from './toast';

type Tab = 'inputs' | 'results';

const shortcuts = (): [string, string][] => [
  ['N', copy.shortcutNewPart],
  ['M', copy.shortcutNewMaterial],
  ['L', copy.shortcutShare],
  ['P', copy.shortcutPrint],
  ['E', copy.shortcutExport],
  ['Enter', copy.shortcutEnter],
  ['⌘/Ctrl V', copy.shortcutPaste],
  ['?', copy.shortcutHelp],
  ['Esc', copy.shortcutEsc],
];

function initialProject(): Project {
  const local = loadLocal();
  const shared = takeSharedProject();
  if (shared && (!local || !hasParts(local) || window.confirm(copy.confirmShared(shared.name)))) {
    return shared;
  }
  return local ?? createProject(copy.defaultProjectName, copy.defaultMaterialName);
}

export function startApp(root: HTMLElement): void {
  const store = new Store(initialProject());
  let activeMaterial: string | null = null;
  let saveTimer = 0;
  let optimizeTimer = 0;

  const restore = (snapshot: Project) => store.set(snapshot, { structure: true });
  const undoable = (message: string, snapshot: Project) =>
    toast(message, { action: { label: copy.undo, run: () => restore(snapshot) } });

  // Header
  const nameInput = h('input', {
    class: 'project-name',
    value: store.get().name,
    maxlength: 120,
    autocomplete: 'off',
    'aria-label': copy.projectName,
    onInput: () => store.change((p) => (p.name = nameInput.value)),
  });
  const saved = h('span', { class: 'saved', 'aria-live': 'polite' });
  const fileInput = h('input', {
    type: 'file',
    accept: '.json,application/json',
    class: 'sr-only',
    tabindex: -1,
    'aria-hidden': 'true',
  });

  const share = async () => {
    const url = shareUrl(store.get());
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: store.get().name, url });
      } catch {
        // dismissed
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast(copy.linkCopied);
    } catch {
      window.prompt(copy.copyPrompt, url);
    }
  };

  const actions: { id: string; label: string; icon: IconName; run: () => void }[] = [
    { id: 'share', label: copy.share, icon: 'share', run: () => void share() },
    { id: 'print', label: copy.print, icon: 'print', run: () => window.print() },
    { id: 'export', label: copy.export, icon: 'download', run: () => downloadProject(store.get()) },
    { id: 'import', label: copy.import, icon: 'upload', run: () => fileInput.click() },
  ];
  const actionButtons = (cls: string) =>
    actions.map((a) =>
      h(
        'button',
        { type: 'button', class: cls, 'data-action': a.id, onClick: a.run },
        icon(a.icon),
        h('span', {}, a.label),
      ),
    );

  const help = h(
    'dialog',
    { class: 'help', 'aria-labelledby': 'help-title' },
    h('h2', { id: 'help-title' }, copy.keyboardShortcuts),
    h(
      'dl',
      {},
      shortcuts().map(([key, what]) => [h('dt', {}, h('kbd', {}, key)), h('dd', {}, what)]),
    ),
    h('form', { method: 'dialog' }, h('button', { class: 'btn' }, copy.gotIt)),
  );

  const tabButton = (tab: Tab, label: string, iconName: IconName, badge?: HTMLElement) =>
    h(
      'button',
      {
        type: 'button',
        role: 'tab',
        class: 'tab',
        id: `tab-${tab}`,
        'aria-controls': `panel-${tab}`,
        onClick: () => setTab(tab),
      },
      icon(iconName),
      label,
      badge,
    );
  const badge = h('span', { class: 'badge', hidden: true });
  const brandMark = icon('blade', 'brand-mark');
  brandMark.title = copy.bladeTitle;
  const tabs = h(
    'div',
    { class: 'tabs', role: 'tablist', 'aria-label': copy.view },
    tabButton('inputs', copy.tabInputs, 'list'),
    tabButton('results', copy.tabResults, 'ruler', badge),
  );

  const header = h(
    'header',
    { class: 'topbar' },
    h(
      'div',
      { class: 'topbar-row' },
      h('div', { class: 'brand' }, brandMark, h('span', {}, 'cutlist')),
      nameInput,
      saved,
      h(
        'nav',
        { class: 'actions', 'aria-label': copy.projectActions },
        actionButtons('btn btn-ghost'),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn-ghost btn-icon',
            'aria-label': copy.keyboardShortcuts,
            onClick: () => help.showModal(),
          },
          icon('keyboard'),
        ),
      ),
    ),
    tabs,
  );

  const inputsPanel = h('section', {
    class: 'panel panel-inputs',
    id: 'panel-inputs',
    role: 'tabpanel',
    'aria-label': copy.tabInputs,
  });
  const resultsPanel = h('section', {
    class: 'panel panel-results',
    id: 'panel-results',
    role: 'tabpanel',
    'aria-label': copy.tabResults,
    'aria-live': 'polite',
    'data-testid': 'results',
  });

  const tip = h('button', { type: 'button', class: 'tip', title: copy.anotherTip });
  let tipIndex = Math.floor(Math.random() * copy.tips.length);
  const nextTip = () => {
    tipIndex = (tipIndex + 1) % copy.tips.length;
    tip.textContent = copy.tips[tipIndex]!;
  };
  tip.addEventListener('click', nextTip);
  nextTip();

  // Language follows the browser; this quiet footer override is remembered.
  const language = h(
    'select',
    {
      class: 'footer-language',
      'aria-label': copy.language,
      onChange: () => {
        if (!isLocaleCode(language.value) || language.value === locale) return;
        setLocale(language.value);
        window.location.reload();
      },
    },
    Object.entries(LANGUAGES).map(([code, name]) =>
      h('option', { value: code, selected: code === locale }, name),
    ),
  );

  const toasts = h('div', { class: 'toasts', 'aria-live': 'polite' });
  mountToasts(toasts);

  root.replaceChildren(
    header,
    h('main', { class: 'layout' }, inputsPanel, resultsPanel),
    h(
      'footer',
      { class: 'footer' },
      tip,
      h('a', { href: 'https://github.com/brianfroelund/cutlist', rel: 'noopener' }, copy.source),
      language,
    ),
    h(
      'nav',
      { class: 'bottombar', 'aria-label': copy.projectActions },
      actionButtons('btn btn-ghost'),
    ),
    toasts,
    help,
    fileInput,
  );

  function setTab(tab: Tab) {
    document.body.dataset.tab = tab;
    for (const t of tabs.querySelectorAll('[role="tab"]')) {
      t.setAttribute('aria-selected', String(t.id === `tab-${tab}`));
    }
    window.scrollTo({ top: 0 });
  }

  const inputsCtx = {
    store,
    onRemoved: (what: string, snapshot: Project) => undoable(copy.removed(what), snapshot),
    onFocusMaterial: (id: string) => (activeMaterial = id),
    onPasted: (added: number, skipped: number, snapshot: Project, kind?: MaterialKind) =>
      added
        ? undoable(copy.pasted(added, skipped), snapshot)
        : toast(kind === 'sheet' ? copy.pasteNothingSheet : copy.pasteNothing),
  };

  const resultsCtx = {
    onExample: () => {
      const snapshot = store.get();
      store.set(exampleProject(copy.example));
      undoable(copy.exampleLoaded, snapshot);
    },
  };

  const celebrate = (result: OptimizeResult) => {
    const done = result.materials.every((m) => m.unplaced.length === 0);
    if (!done || result.totals.pieces === 0 || result.totals.wastePct > 2) return;
    if (sessionStorage.getItem('cutlist:celebrated')) return;
    sessionStorage.setItem('cutlist:celebrated', '1');
    sawdustBurst();
    toast(copy.celebrate);
  };

  const optimizer = new OptimizerClient((result, project) => {
    renderResults(resultsPanel, result, project, resultsCtx);
    badge.hidden = result.totals.pieces === 0;
    badge.textContent = String(result.totals.pieces);
    celebrate(result);
  }, setFaviconBusy);

  store.subscribe((project, options) => {
    if (options.structure) renderInputs(inputsPanel, inputsCtx, options.focus);
    if (nameInput.value !== project.name) nameInput.value = project.name;
    window.clearTimeout(optimizeTimer);
    optimizeTimer = window.setTimeout(() => optimizer.run(store.get()), 120);
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      if (!saveLocal(store.get())) return;
      saved.textContent = copy.saved;
      saved.classList.add('show');
      window.setTimeout(() => saved.classList.remove('show'), 1200);
    }, 400);
  });

  const flushSave = () => {
    window.clearTimeout(saveTimer);
    saveLocal(store.get());
  };
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSave();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const project = await readProjectFile(file);
      const snapshot = store.get();
      store.set(project);
      undoable(copy.imported(project.name), snapshot);
    } catch {
      toast(copy.importFailed);
    }
  });

  const newPart = () => {
    const materials = store.get().materials;
    const target = materials.find((m) => m.id === activeMaterial) ?? materials[0];
    setTab('inputs');
    if (target) addPart(store, target.id);
    else addMaterial(store);
  };

  const bindings: Record<string, () => void> = {
    n: newPart,
    m: () => {
      setTab('inputs');
      addMaterial(store);
    },
    l: () => void share(),
    p: () => window.print(),
    e: () => downloadProject(store.get()),
    '?': () => help.showModal(),
  };
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || help.open) return;
    const run = bindings[e.key.toLowerCase()];
    if (!run) return;
    e.preventDefault();
    run();
  });

  // Paste anywhere outside a field adds parts to the material you last worked in.
  document.addEventListener('paste', (e) => {
    if (isTyping(e.target) || help.open) return;
    const text = e.clipboardData?.getData('text/plain');
    const materials = store.get().materials;
    const target = materials.find((m) => m.id === activeMaterial) ?? materials[0];
    if (!text || !target) return;
    e.preventDefault();
    setTab('inputs');
    pasteParts(inputsCtx, target.id, text);
  });

  let closeTidyToast: (() => void) | null = null;
  // Built only at print time so typing never pays for QR encoding.
  window.addEventListener('beforeprint', () => {
    const slot = resultsPanel.querySelector<HTMLElement>('.print-qr');
    if (slot) {
      const url = shareUrl(store.get());
      const qr = qrSvg(...splitShareUrl(url));
      slot.replaceChildren(
        ...(qr ? [qr, h('span', {}, copy.printQr)] : [h('span', {}, copy.printQrTooLarge)]),
      );
    }
  });

  installBlade(brandMark, {
    onSawn: (tidy) => {
      closeTidyToast ??= toast(copy.sawn, {
        sticky: true,
        action: { label: copy.tidyUp, run: tidy },
      });
    },
    onTidy: () => {
      closeTidyToast?.();
      closeTidyToast = null;
    },
  });

  setTab('inputs');
  renderInputs(inputsPanel, inputsCtx);
  optimizer.run(store.get());
}
