import type { Writable } from 'svelte/store';
import { get } from 'svelte/store';

export function resize(node: HTMLElement, store: Writable<DOMRect>) {
  const r = get(store);
  node.style.width = r.width + 'px';
  node.style.height = r.height + 'px';
  node.style.left = r.x + 'px';
  node.style.top = r.y + 'px';

  const observer = new ResizeObserver(entries => {
    const r = get(store);
    store.set(new DOMRect(r.x, r.y, entries[0].contentRect.width, entries[0].contentRect.height));
  });

  observer.observe(node);

  return {
    destroy() {
      observer.disconnect();
    }
  };
}
