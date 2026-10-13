import { h, reducedMotion } from '../dom';

/** A short drift of sawdust from the top of the screen. */
export function sawdustBurst(): void {
  if (reducedMotion()) return;
  const layer = h('div', { class: 'sawdust', 'aria-hidden': 'true' });
  for (let i = 0; i < 70; i++) {
    const chip = h('i');
    chip.style.setProperty('--x', `${Math.random() * 100}vw`);
    chip.style.setProperty('--dx', `${(Math.random() - 0.5) * 30}vw`);
    chip.style.setProperty('--r', `${(Math.random() - 0.5) * 720}deg`);
    chip.style.setProperty('--d', `${Math.random() * 400}ms`);
    chip.style.setProperty('--t', `${1400 + Math.random() * 900}ms`);
    chip.style.setProperty('--s', `${3 + Math.random() * 5}px`);
    layer.append(chip);
  }
  document.body.append(layer);
  window.setTimeout(() => layer.remove(), 3000);
}
