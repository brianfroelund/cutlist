import { isTyping } from '../dom';

const WORD = 'sawdust';

/** Easter egg: type "sawdust" anywhere outside a field to toggle a pencil-sketch theme. */
export function installSketchMode(onToggle: (on: boolean) => void): void {
  let buffer = '';
  document.addEventListener('keydown', (e) => {
    if (isTyping(e.target) || e.key.length !== 1 || e.metaKey || e.ctrlKey) return;
    buffer = (buffer + e.key.toLowerCase()).slice(-WORD.length);
    if (buffer !== WORD) return;
    buffer = '';
    onToggle(document.documentElement.classList.toggle('sketch'));
  });
}
