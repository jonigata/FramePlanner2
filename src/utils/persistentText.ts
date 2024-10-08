import { createPreference } from '../preferences';

interface PersistentOptions {
  store: string;
  key: string;
  onLoad?: (value: string) => void;
}

export function persistentText(node: HTMLElement, options: PersistentOptions) {
  const { store, key, onLoad } = options;

  const preference = createPreference<string>(store, key);

  async function load() {
    const value = await preference.get();
    if (value) {
      if (onLoad) {
        onLoad(value);
      }
      if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
        node.value = value;
      } else {
        node.textContent = value;
      }
    }
  }

  async function save(value: string) {
    await preference.set(value);
  }

  function onInput() {
    const value = node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement
      ? node.value
      : node.textContent || '';
    save(value);
  }

  node.addEventListener('input', onInput);
  load(); // 初期ロード

  return {
    update(newOptions: PersistentOptions) {
      Object.assign(options, newOptions);
    },
    destroy() {
      node.removeEventListener('input', onInput);
    }
  };
}
