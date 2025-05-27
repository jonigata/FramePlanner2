import { openDB, type IDBPDatabase } from 'idb';

export type PreferenceStore = "imaging" | "filesystem";
const preferencesVersion = 2;

export type FileSystemPreference = {
  type: "fsa",
  handle: FileSystemDirectoryHandle;
};

let dbPromise: Promise<IDBPDatabase<unknown>>;

export function assurePreferences() {
  console.log("assurePreferences");
  dbPromise = openDB("preferences", preferencesVersion, {
    upgrade(db, oldVersion, newVersion) {
      console.log(`Upgrading preferences DB from version ${oldVersion} to ${newVersion}`);
      
      // バージョン1: imagingストアを作成
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains("imaging")) {
          db.createObjectStore("imaging");
          console.log("Created imaging store");
        }
      }

      // バージョン2: filesystemストアを作成
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains("filesystem")) {
          db.createObjectStore("filesystem");
          console.log("Created filesystem store");
        }
      }
    }
  });
  console.log("assurePreferences done", dbPromise);
}

export function getPreferencePromise() {
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
      console.trace();
      console.log(await dbPromise);
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

