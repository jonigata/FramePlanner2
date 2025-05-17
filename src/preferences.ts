import { openDB, type IDBPDatabase } from 'idb';

export type PreferenceStore = "imaging" | "filesystem";
const preferencesStores = ["imaging"];
const preferencesVersion = 1;

let dbPromise: Promise<IDBPDatabase<unknown>>;

export function assurePreferences() {
  dbPromise = openDB("preferences", preferencesVersion, {
    upgrade(db) {
      for (const store of preferencesStores) {
        db.createObjectStore(store);
      }
    }
  });
}

export function getDBPromise() {
  return dbPromise;
}

export function createPreference<T>(storeName: PreferenceStore, key: string) {
  let saved: T | undefined = undefined;
  return {
    get: async () => {
      saved = await (await dbPromise).get(storeName, key);
      console.log("preference get", saved);
      return saved;
    },
    getOrDefault: async (defaultValue: T) => {
      saved = await (await dbPromise).get(storeName, key);
      if (saved === undefined) {
        saved = defaultValue;
        await (await dbPromise).put(storeName, defaultValue, key);
      }
      console.log("preference getOrDefault", saved);
      return saved;
    },
    set: async (value: T) => {
      if (value !== saved) {
        saved = value;
        await (await dbPromise).put(storeName, value, key);
        console.log("preference set", value);
      }
    }
  };
}

