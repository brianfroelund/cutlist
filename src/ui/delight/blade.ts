import { h, reducedMotion } from '../dom';
import { icon } from '../icons';

// Smallest matching ancestor wins, so fields go before rows and rows before cards.
const CUTTABLE = [
  '.seg',
  '.stat',
  '.cut',
  '.btn',
  '.tab',
  '.field',
  '.section-title',
  '.material-name',
  '.project-name',
  '.brand > span:last-child',
  '.verdict',
  '.shopping li',
  '.board-head',
  '.step',
  '.hint',
  '.tip',
  '.footer a',
  '.empty h2',
  '.empty p',
  '.illustration',
  '.issue',
  '.result-head',
  '.switch',
  '.segmented',
  '.bar',
  '.row-head > span',
  'h2',
  'h3',
].join(',');

const GRAVITY = 2600;
const SAMPLE_STEP = 8;

interface Point {
  x: number;
  y: number;
}

interface Piece {
  el: HTMLElement;
  top: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
}

/** Keeps the part of a convex polygon on one side of the line through `p` with normal `n`. */
function clip(poly: Point[], p: Point, n: Point, sign: number): Point[] {
  const side = (q: Point) => sign * ((q.x - p.x) * n.x + (q.y - p.y) * n.y);
  const out: Point[] = [];
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length]!;
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) out.push(a);
    if (sa >= 0 !== sb >= 0) {
      const t = sa / (sa - sb);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  });
  return out;
}

/**
 * Drag the brand blade across the page to saw elements in half; the halves fall away.
 * Purely visual: originals are only hidden, and `tidy` brings them back.
 */
export function installBlade(handle: HTMLElement, onSawn: (tidy: () => void) => void): void {
  const layer = h('div', { class: 'saw-layer', 'aria-hidden': 'true' });
  const blade = h('div', { class: 'saw-blade', 'aria-hidden': 'true' }, icon('blade'));
  const sawn: HTMLElement[] = [];
  const pieces: Piece[] = [];
  let dragging = false;
  let cutThisDrag = false;
  let last: Point = { x: 0, y: 0 };
  let dir: Point = { x: 1, y: 0 };
  let frame = 0;
  let lastTick = 0;

  const tidy = () => {
    for (const el of sawn.splice(0)) {
      el.style.visibility = '';
      delete el.dataset.sawn;
      if (el.isConnected) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    }
  };

  const place = (p: Point) => {
    blade.style.transform = `translate(${p.x}px, ${p.y}px)`;
  };

  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - lastTick) / 1000);
    lastTick = now;
    for (let i = pieces.length - 1; i >= 0; i--) {
      const piece = pieces[i]!;
      piece.vy += GRAVITY * dt;
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.angle += piece.spin * dt;
      piece.el.style.transform = `translate(${piece.x}px, ${piece.y}px) rotate(${piece.angle}deg)`;
      if (piece.top + piece.y > window.innerHeight + 200) {
        piece.el.remove();
        pieces.splice(i, 1);
      }
    }
    frame = pieces.length ? requestAnimationFrame(tick) : 0;
  };

  const launch = (piece: Piece) => {
    pieces.push(piece);
    if (!frame) {
      lastTick = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };

  const dust = (p: Point) => {
    for (let i = 0; i < 8; i++) {
      const chip = h('i', { class: 'saw-chip' });
      chip.style.left = `${p.x}px`;
      chip.style.top = `${p.y}px`;
      layer.append(chip);
      launch({
        el: chip,
        top: p.y,
        x: 0,
        y: 0,
        vx: (Math.random() - 0.5) * 500,
        vy: -200 - Math.random() * 300,
        angle: 0,
        spin: (Math.random() - 0.5) * 900,
      });
    }
  };

  const cut = (el: HTMLElement, p: Point) => {
    const rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return;
    const local = { x: p.x - rect.left, y: p.y - rect.top };
    const box = [
      { x: 0, y: 0 },
      { x: rect.width, y: 0 },
      { x: rect.width, y: rect.height },
      { x: 0, y: rect.height },
    ];
    const normal = { x: -dir.y, y: dir.x };
    const computed = getComputedStyle(el);

    for (const sign of [1, -1]) {
      const poly = clip(box, local, normal, sign);
      if (poly.length < 3) continue;
      const half = el.cloneNode(true) as HTMLElement;
      half.removeAttribute('id');
      half.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      // Copy the computed look so the half renders the same outside its original ancestors.
      for (const prop of computed) half.style.setProperty(prop, computed.getPropertyValue(prop));
      Object.assign(half.style, {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        right: 'auto',
        bottom: 'auto',
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: '0',
        boxSizing: 'border-box',
        visibility: 'visible',
        transition: 'none',
        animation: 'none',
        translate: 'none',
        rotate: 'none',
        scale: 'none',
        transform: 'none',
        transformOrigin: `${local.x}px ${local.y}px`,
        clipPath: `polygon(${poly.map((q) => `${q.x}px ${q.y}px`).join(', ')})`,
        pointerEvents: 'none',
      });
      layer.append(half);
      launch({
        el: half,
        top: rect.top,
        x: 0,
        y: 0,
        vx: normal.x * sign * 160 + dir.x * 120,
        vy: normal.y * sign * 160 + dir.y * 120 - 160,
        angle: 0,
        spin: sign * (40 + Math.random() * 140),
      });
    }

    el.style.visibility = 'hidden';
    el.dataset.sawn = '';
    sawn.push(el);
    cutThisDrag = true;
    dust(p);
  };

  const sawAt = (p: Point) => {
    const hit = document.elementsFromPoint(p.x, p.y).find((el) => !handle.contains(el));
    const target = hit?.closest<HTMLElement>(CUTTABLE);
    if (!target || target.closest('[data-sawn]') || target.contains(handle)) return;
    cut(target, p);
  };

  const move = (e: PointerEvent) => {
    if (!dragging) return;
    const p = { x: e.clientX, y: e.clientY };
    const dx = p.x - last.x;
    const dy = p.y - last.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;
    dir = { x: dx / dist, y: dy / dist };
    // Sample along the path so fast flicks don't skip over small elements.
    const steps = Math.max(1, Math.ceil(dist / SAMPLE_STEP));
    for (let i = 1; i <= steps; i++) {
      sawAt({ x: last.x + (dx * i) / steps, y: last.y + (dy * i) / steps });
    }
    last = p;
    place(p);
  };

  const end = () => {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove('sawing');
    const home = handle.getBoundingClientRect();
    const target = { x: home.left + home.width / 2, y: home.top + home.height / 2 };
    blade
      .animate(
        [
          { transform: `translate(${last.x}px, ${last.y}px)` },
          { transform: `translate(${target.x}px, ${target.y}px) scale(0.45)` },
        ],
        { duration: 380, easing: 'cubic-bezier(.5,0,.2,1)' },
      )
      .finished.finally(() => {
        blade.remove();
        handle.classList.remove('dragging');
      });
    if (cutThisDrag) onSawn(tidy);
  };

  handle.addEventListener('pointerdown', (e) => {
    if (reducedMotion() || e.button !== 0) return;
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    dragging = true;
    cutThisDrag = false;
    last = { x: e.clientX, y: e.clientY };
    if (!layer.isConnected) document.body.append(layer);
    document.body.append(blade);
    document.body.classList.add('sawing');
    handle.classList.add('dragging');
    place(last);
  });
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sawn.length) tidy();
  });
  window.addEventListener('beforeprint', tidy);
}
