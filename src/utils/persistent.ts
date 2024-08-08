import { openDB } from 'idb';

interface PersistentOptions {
  db: string;
  store: string;
  key: string;
  version?: number;
  onLoad?: (value: string) => void;
}

export function persistent(node: HTMLElement, options: PersistentOptions) {
  const { db, store, key, version = 1, onLoad } = options;

  const dbPromise = openDB(db, version, {
    upgrade(db) {
      db.createObjectStore(store);
    }
  });

  async function load() {
    const value = await (await dbPromise).get(store, key) || '';
    if (onLoad) {
      onLoad(value);
    }
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
      node.value = value;
    } else {
      node.textContent = value;
    }
  }

  async function save(value: string) {
    await (await dbPromise).put(store, value, key);
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