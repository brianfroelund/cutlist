import qrcode from 'qrcode-generator';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Beyond ~version 16 the modules get too small to scan reliably at print size. */
export const MAX_QR_MODULES = 81;

/**
 * Draws a QR code as SVG elements (no markup strings involved).
 * `prefix` is stored as bytes; `alphanumeric` (A–Z, 0–9, $*+-./:) in the denser alphanumeric mode.
 * Returns null when the code would be too dense to scan.
 */
export function qrSvg(prefix: string, alphanumeric: string): SVGSVGElement | null {
  const qr = qrcode(0, 'L');
  qr.addData(prefix, 'Byte');
  qr.addData(alphanumeric, 'Alphanumeric');
  qr.make();
  const size = qr.getModuleCount();
  if (size > MAX_QR_MODULES) return null;

  const border = 2;
  let d = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (qr.isDark(y, x)) d += `M${x + border} ${y + border}h1v1h-1z`;
    }
  }
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size + 2 * border} ${size + 2 * border}`);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', '#000');
  svg.append(path);
  return svg;
}
