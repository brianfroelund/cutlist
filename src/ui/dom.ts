type AttrValue = string | number | boolean | null | undefined | EventListener;
type Child = Node | string | number | null | undefined | false | Child[];

/** Tiny element builder. Text children become text nodes, so user data is never parsed as HTML. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, AttrValue> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'class') {
      el.className = String(value);
    } else {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }
  const append = (child: Child): void => {
    if (Array.isArray(child)) child.forEach(append);
    else if (child !== null && child !== undefined && child !== false) {
      el.append(child instanceof Node ? child : String(child));
    }
  };
  children.forEach(append);
  return el;
}

export const reducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
