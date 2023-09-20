<script lang="ts">
  // IndexedDBのデータベース名とストア名を定義
  const dbName = 'fontHistoryDB';
  const storeName = 'fontHistory';

  let db: IDBDatabase;

  // IndexedDBを開く
  const openRequest = indexedDB.open(dbName, 1);

  openRequest.onupgradeneeded = (event: IDBVersionChangeEvent) => {
    const db = (event.target as IDBOpenDBRequest).result;
    db.createObjectStore(storeName);
  };

  openRequest.onsuccess = (event: Event) => {
    db = (event.target as IDBOpenDBRequest).result;
  };

  export function add(fontname: string) {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.put(fontname, fontname);
  }

  export function remove(fontname: string) {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.delete(fontname);
  }

  export function getAll() {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    return store.getAll();
  }

  export async function isReady() {
    return new Promise((resolve) => {
      const timer = setInterval(() => {
        if (db) {
          clearInterval(timer);
          resolve(null);
        }
      }, 100);
    });
  }
</script>