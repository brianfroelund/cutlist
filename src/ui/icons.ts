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

export function workbench(): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'illustration';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 160 90" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="19,16 135,16 137,22 17,22"/>
    <polygon points="137,17 144,17 146,22 137,22"/>
    <rect x="56" y="22" width="81" height="9" rx="0.5"/>
    <rect x="17" y="22" width="3" height="9"/>
    <rect x="91" y="24.5" width="12" height="4" rx="0.6" stroke-width="1"/>
    <polygon points="20,22 56,22 56,24.5 20,24.5"/>
    <rect x="20" y="24.5" width="36" height="8" rx="0.5"/>
    <rect x="30" y="26" width="18" height="3" rx="0.5" fill="currentColor" fill-opacity="0.35"/>
    <circle cx="39" cy="27.5" r="2.2" fill="currentColor"/>
    <line x1="39" y1="23.5" x2="39" y2="44" stroke-width="1.8"/>
    <circle cx="39" cy="44" r="1.2" fill="currentColor"/>
    <rect x="139" y="22" width="7" height="9" rx="0.5"/>
    <line x1="146" y1="26.5" x2="148" y2="26.5"/>
    <circle cx="148" cy="26.5" r="1.8" fill="currentColor"/>
    <line x1="148" y1="23" x2="148" y2="40" stroke-width="1.6"/>
    <circle cx="148" cy="40" r="1" fill="currentColor"/>
    <circle cx="26" cy="19.5" r="0.9" fill="currentColor"/>
    <circle cx="34" cy="19.5" r="0.9" fill="currentColor"/>
    <circle cx="42" cy="19.5" r="0.9" fill="currentColor"/>
    <circle cx="50" cy="19.5" r="0.9" fill="currentColor"/>
    <circle cx="68" cy="19.5" r="0.9" fill="currentColor"/>
    <circle cx="86" cy="19.5" r="0.9" fill="currentColor"/>
    <circle cx="104" cy="19.5" r="0.9" fill="currentColor"/>
    <circle cx="30" cy="17.5" r="0.8" fill="currentColor"/>
    <circle cx="38" cy="17.5" r="0.8" fill="currentColor"/>
    <circle cx="46" cy="17.5" r="0.8" fill="currentColor"/>
    <circle cx="76" cy="17.5" r="0.8" fill="currentColor"/>
    <circle cx="94" cy="17.5" r="0.8" fill="currentColor"/>
    <circle cx="112" cy="17.5" r="0.8" fill="currentColor"/>
    <rect x="120" y="14" width="2" height="3" fill="currentColor"/>
    <rect x="126" y="17" width="2" height="3" fill="currentColor"/>
    <path d="M34 31 L34 78" stroke-opacity="0.45"/>
    <path d="M122 31 L122 78" stroke-opacity="0.45"/>
    <line x1="34" y1="33" x2="122" y2="33" stroke-opacity="0.5"/>
    <line x1="34" y1="39" x2="122" y2="39" stroke-opacity="0.5"/>
    <circle cx="44" cy="36" r="1.5" stroke-width="1" stroke-opacity="0.7"/>
    <circle cx="112" cy="36" r="1.5" stroke-width="1" stroke-opacity="0.7"/>
    <line x1="34" y1="65" x2="122" y2="65" stroke-opacity="0.5"/>
    <line x1="34" y1="71" x2="122" y2="71" stroke-opacity="0.5"/>
    <circle cx="44" cy="68" r="1.5" stroke-width="1" stroke-opacity="0.7"/>
    <circle cx="112" cy="68" r="1.5" stroke-width="1" stroke-opacity="0.7"/>
    <rect x="28" y="31" width="6" height="50" rx="0.5"/>
    <rect x="122" y="31" width="6" height="50" rx="0.5"/>
    <rect x="34" y="38" width="88" height="6" rx="0.5"/>
    <rect x="34" y="70" width="88" height="6" rx="0.5"/>
    <circle cx="31" cy="41" r="0.9" fill="currentColor"/>
    <circle cx="31" cy="54" r="0.9" fill="currentColor"/>
    <circle cx="31" cy="73" r="0.9" fill="currentColor"/>
    <circle cx="125" cy="41" r="0.9" fill="currentColor"/>
    <circle cx="125" cy="54" r="0.9" fill="currentColor"/>
    <circle cx="125" cy="73" r="0.9" fill="currentColor"/>
    <rect x="26" y="81" width="8" height="6" rx="0.5"/>
    <path d="M34 81 L38 78 L38 84 L34 87"/>
    <rect x="122" y="81" width="8" height="6" rx="0.5"/>
    <path d="M122 81 L118 78 L118 84 L122 87"/>
  </svg>`;
  return span;
}

export const sawhorse = workbench;

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
