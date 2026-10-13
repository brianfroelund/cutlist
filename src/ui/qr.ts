import { encode } from 'uqr';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Above this a phone camera struggles with the module density at print size. */
export const MAX_QR_TEXT = 1200;

/** Draws a QR code as SVG elements (no markup strings involved). */
export function qrSvg(text: string): SVGSVGElement {
  const { data } = encode(text, { ecc: 'L', border: 2 });
  const size = data.length;
  let d = '';
  data.forEach((row, y) =>
    row.forEach((on, x) => {
      if (on) d += `M${x} ${y}h1v1h-1z`;
    }),
  );
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', '#000');
  svg.append(path);
  return svg;
}
