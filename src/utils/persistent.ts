import { openDB } from 'idb';

export function persistent(node: HTMLElement, parameters: any) {
  const dbName = parameters.db as string;
  const storeName = parameters.store as string;
  const key = parameters.key as string;
  const version = parameters.version as number || 1; // バージョンはパラメータで指定、デフォルトは1

  async function open() {
    const db = await openDB(dbName, version, {
      upgrade(db) {
        db.createObjectStore(storeName);
      }
    });
    return db;
  }

  const dbPromise = open();

  async function save(value: any) {
    console.log("save", storeName, key, value);
    await (await dbPromise).put(storeName, value, key);
  }

  async function load() {
    console.log('load');
    return (await dbPromise).get(storeName, key);
  }

  async function updateValue() {
    const value = await load();
    console.log("load", value);
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
      node.value = value || '';
    } else {
      node.textContent = value || '';
    }
  }

  async function onInput() {
    console.log("onInput");
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
      await save(node.value);
    } else {
      await save(node.textContent);
    }
  }

  function setup() {
    node.addEventListener('input', onInput);

    console.log("setup");
    updateValue();
  }

  setup();

  return {
    destroy() {
      node.removeEventListener("input", onInput);
    }
  };
}
