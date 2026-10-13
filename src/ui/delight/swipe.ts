const THRESHOLD = 90;

/** Swipe a row left on touch screens to delete it. The visible × button remains the accessible path. */
export function attachSwipe(wrap: HTMLElement, row: HTMLElement, onDelete: () => void): void {
  let startX = 0;
  let startY = 0;
  let dx = 0;
  let mode: 'idle' | 'pending' | 'swiping' | 'scrolling' = 'idle';

  const reset = () => {
    row.style.transition = 'transform .2s ease';
    row.style.transform = '';
    wrap.classList.remove('swiping', 'armed');
    mode = 'idle';
  };

  row.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    startX = e.clientX;
    startY = e.clientY;
    dx = 0;
    mode = 'pending';
  });

  row.addEventListener('pointermove', (e) => {
    if (mode === 'idle' || mode === 'scrolling') return;
    dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (mode === 'pending') {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        mode = 'swiping';
        row.setPointerCapture(e.pointerId);
        wrap.classList.add('swiping');
        row.style.transition = 'none';
      } else if (Math.abs(dy) > 10) {
        mode = 'scrolling';
      }
      return;
    }
    row.style.transform = `translateX(${Math.min(0, dx)}px)`;
    wrap.classList.toggle('armed', dx < -THRESHOLD);
  });

  const end = () => {
    if (mode === 'swiping' && dx < -THRESHOLD) {
      row.style.transition = 'transform .18s ease';
      row.style.transform = 'translateX(-110%)';
      window.setTimeout(onDelete, 160);
      return;
    }
    reset();
  };
  row.addEventListener('pointerup', end);
  row.addEventListener('pointercancel', reset);
}
