type DataCopy = { [storeName: string]: any[] };

export const copyIndexedDB = (dbName: string): Promise<DataCopy> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
    let db: IDBDatabase | null = null;

    request.onsuccess = (event: Event) => {
      db = (event.target as IDBOpenDBRequest).result;
      const dataCopy: DataCopy = {};

      const transaction = db.transaction(db.objectStoreNames, "readonly");
      transaction.oncomplete = () => {
        resolve(dataCopy);
      };
      transaction.onerror = (event) => reject(event);

      Array.from(db.objectStoreNames).forEach((storeName) => {
        const store = transaction.objectStore(storeName);
        const query = store.getAll();

        query.onsuccess = () => {
          dataCopy[storeName] = query.result;
        };
      });
    };

    request.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };
  });
};


export const restoreIndexedDB = (dbName: string, dataCopy: DataCopy): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      // Create object stores if they don't exist, based on dataCopy keys
      let db = (event.target as IDBOpenDBRequest).result;
      Object.keys(dataCopy).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      });
    };

    request.onsuccess = (event: Event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(db.objectStoreNames, "readwrite");

      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => reject(event);

      Object.entries(dataCopy).forEach(([storeName, records]) => {
        const store = transaction.objectStore(storeName);
        // Clear existing entries to avoid duplicates
        store.clear();
        records.forEach((record) => {
          store.add(record);
        });
      });
    };

    request.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };
  });
};
