import { reducedMotion } from '../dom';

export function captureRects(root: HTMLElement): Map<string, DOMRect> {
  const rects = new Map<string, DOMRect>();
  for (const el of root.querySelectorAll<HTMLElement>('[data-flip]')) {
    rects.set(el.dataset.flip!, el.getBoundingClientRect());
  }
  return rects;
}

/** FLIP: pieces glide from their previous spot when the layout changes. */
export function playFlip(root: HTMLElement, before: Map<string, DOMRect>): void {
  if (reducedMotion() || before.size === 0) return;
  for (const el of root.querySelectorAll<HTMLElement>('[data-flip]')) {
    const prev = before.get(el.dataset.flip!);
    const now = el.getBoundingClientRect();
    if (!prev) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
      continue;
    }
    const dx = prev.left - now.left;
    const dy = prev.top - now.top;
    const sx = now.width > 0 ? prev.width / now.width : 1;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.01) continue;
    el.animate(
      [
        { transformOrigin: 'left center', transform: `translate(${dx}px, ${dy}px) scaleX(${sx})` },
        { transformOrigin: 'left center', transform: 'none' },
      ],
      { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' },
    );
  }
}
