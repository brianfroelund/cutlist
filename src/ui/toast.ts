import { h } from './dom';

let container: HTMLElement | null = null;

export function mountToasts(el: HTMLElement): void {
  container = el;
}

interface ToastOptions {
  action?: { label: string; run: () => void };
  timeout?: number;
}

export function toast(message: string, options: ToastOptions = {}): void {
  if (!container) return;
  const el = h('div', { class: 'toast' }, h('span', {}, message));
  const close = () => {
    el.classList.add('leaving');
    window.setTimeout(() => el.remove(), 200);
  };
  if (options.action) {
    const { label, run } = options.action;
    el.append(
      h(
        'button',
        {
          type: 'button',
          class: 'toast-action',
          onClick: () => {
            run();
            close();
          },
        },
        label,
      ),
    );
  }
  container.append(el);
  while (container.children.length > 3) container.firstElementChild?.remove();
  window.setTimeout(close, options.timeout ?? (options.action ? 6000 : 3500));
}
