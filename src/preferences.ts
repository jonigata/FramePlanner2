import { openDB, type IDBPDatabase } from 'idb';

export type PreferenceStore = "imaging" | "filesystem";
const preferencesVersion = 2;

export type FileSystemPreference = {
  type: "fsa",
  handle: FileSystemDirectoryHandle;
};

let dbPromise: Promise<IDBPDatabase<unknown>>;

export function assurePreferences() {
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

