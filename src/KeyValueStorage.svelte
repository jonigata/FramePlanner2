<script lang="ts">
  import { onMount } from "svelte";
  import { writable } from "svelte/store";

  // IndexedDBのデータベース名とストア名を定義
  export let dbName: string;
  export let storeName: string;

  let db: IDBDatabase;

  // IndexedDBを開く
  onMount(() => {
    const openRequest = indexedDB.open(dbName, 1);

    openRequest.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      db.createObjectStore(storeName);
    };

    openRequest.onsuccess = (event: Event) => {
      db = (event.target as IDBOpenDBRequest).result;
    };
  });

  export function set(key: string, value: string) {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.put(value, key);
  }

  export function get(key: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const objectStoreRequest = store.get(key);
      
      objectStoreRequest.onsuccess = (_event: Event) => {
        resolve(objectStoreRequest.result);
      };

      objectStoreRequest.onerror = (event: any) => {
        reject(event.error);
      };
    });
  };

  export function remove(key: string) {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.delete(key);
  }

  export async function isReady() {
    // TODO: 名前が変
    // 実装も変
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