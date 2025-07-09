import { openDB, type IDBPDatabase } from 'idb';
import { writable, type Writable } from 'svelte/store';

export type PreferenceStore = "imaging" | "filesystem" | "gadgetStore" | "tweakUi";
const preferencesVersion = 4;

export type FileSystemPreference = {
  type: "fsa",
  handle: FileSystemDirectoryHandle;
};

export type GadgetStorePreference = {
  store: "local" | "fsa";
}

let dbPromise: Promise<IDBPDatabase<unknown>>;

export function assurePreferences() {
  if (dbPromise !== undefined) {
    return;
  }
  dbPromise = openDB("preferences", preferencesVersion, {
    upgrade(db, oldVersion, newVersion) {
      // バージョン1: imagingストアを作成
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains("imaging")) {
          db.createObjectStore("imaging");
        }
      }

      // バージョン2: filesystemストアを作成
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains("filesystem")) {
          db.createObjectStore("filesystem");
        }
      }

      // バージョン3: gadgetストアを作成
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains("gadgetStore")) {
          db.createObjectStore("gadgetStore");
        }
      }

      // バージョン4: tweakUiストアを作成
      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains("tweakUi")) {
          db.createObjectStore("tweakUi");
        }
      }
    }
  });
}

export function getPreferencePromise() {
  return dbPromise;
}

export function createPreference<T>(storeName: PreferenceStore, key: string) {
  let saved: T | undefined = undefined;
  return {
    get: async () => {
      saved = await (await dbPromise).get(storeName, key);
      return saved;
    },
    getOrDefault: async (defaultValue: T) => {
      saved = await (await dbPromise).get(storeName, key);
      if (saved === undefined) {
        saved = defaultValue;
        await (await dbPromise).put(storeName, defaultValue, key);
      }
      return saved;
    },
    set: async (value: T) => {
      if (value !== saved) {
        saved = value;
        await (await dbPromise).put(storeName, value, key);
      }
    }
  };
}

export function createPreferenceStore<T>(storeName: PreferenceStore, key: string, defaultValue: T): Writable<T> {
  const store = writable<T>(defaultValue);
  let isInitialized = false;
  
  // 初期値をDBから読み込む
  dbPromise.then(async (db) => {
    const saved = await db.get(storeName, key);
    if (saved !== undefined) {
      store.set(saved);
    } else {
      // デフォルト値を保存
      await db.put(storeName, defaultValue, key);
    }
    isInitialized = true;
  });
  
  // ストアの変更を監視してDBに保存
  store.subscribe(async (value) => {
    if (isInitialized) {
      const db = await dbPromise;
      await db.put(storeName, value, key);
    }
  });
  
  return store;
}

