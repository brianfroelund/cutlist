function bladePoints(teeth: number, outer: number, inner: number, c = 12): string {
  const points: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const b = ((i + 0.7) / teeth) * Math.PI * 2;
    points.push(`${(c + Math.cos(a) * outer).toFixed(2)},${(c + Math.sin(a) * outer).toFixed(2)}`);
    points.push(`${(c + Math.cos(b) * inner).toFixed(2)},${(c + Math.sin(b) * inner).toFixed(2)}`);
  }
  return points.join(' ');
}

// Static markup only — never interpolate user data into these strings.
const PATHS = {
  blade: `<polygon points="${bladePoints(14, 10.5, 8)}"/><circle cx="12" cy="12" r="2.5"/>`,
  share:
    '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/>',
  print:
    '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="1.5"/><path d="M7 14h10v7H7z"/>',
  download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  upload: '<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  keyboard:
    '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  ruler: '<rect x="2" y="8" width="20" height="8" rx="1"/><path d="M6 8v3M10 8v4M14 8v3M18 8v4"/>',
} as const;

export type IconName = keyof typeof PATHS;

export function icon(name: IconName, className = 'icon'): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = className;
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${PATHS[name]}</svg>`;
  return span;
}

export function sawhorse(): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'illustration';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 160 90" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="18" y="22" width="124" height="10" rx="1.5"/>
    <path d="M40 32 28 84M40 32l12 52M120 32l-12 52M120 32l12 52M34 60h12M114 60h12"/>
    <path d="M60 14h40" stroke-dasharray="3 5"/>
  </svg>`;
  return span;
}

export function drawBlade(
  ctx: CanvasRenderingContext2D,
  size: number,
  angle: number,
  color: string,
): void {
  const r = size / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(r, r);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  const teeth = 12;
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const radius = i % 2 === 0 ? r : r * 0.74;
    ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
