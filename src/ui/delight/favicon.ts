import { reducedMotion } from '../dom';
import { drawBlade } from '../icons';

let delay = 0;
let timer = 0;
let original: string | null = null;

const link = () => document.querySelector<HTMLLinkElement>('link[rel="icon"]');

/** Spins a little saw blade in the tab while a slow optimization runs. */
export function setFaviconBusy(busy: boolean): void {
  if (busy) {
    if (delay || timer || reducedMotion()) return;
    delay = window.setTimeout(start, 200);
    return;
  }
  window.clearTimeout(delay);
  delay = 0;
  if (!timer) return;
  window.clearInterval(timer);
  timer = 0;
  const el = link();
  if (el && original) el.href = original;
}

function start() {
  delay = 0;
  const el = link();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!el || !ctx) return;
  original ??= el.href;
  let angle = 0;
  timer = window.setInterval(() => {
    angle += 0.45;
    drawBlade(ctx, 32, angle, '#586e75');
    el.href = canvas.toDataURL('image/png');
  }, 70);
}
