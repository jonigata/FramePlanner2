<script lang="ts">
  import { onMount } from "svelte";

  // IndexedDBのデータベース名とストア名を定義
  export let dbName: string;
  export let storeName: string;

  let db;

  // IndexedDBを開く
  onMount(() => {
    const openRequest = indexedDB.open(dbName, 1);

    openRequest.onupgradeneeded = (event) => {
      console.log('onupgradeneeded', event);
      const db = event.target.result;
      db.createObjectStore(storeName);
    };

    openRequest.onsuccess = (event) => {
      console.log('onsuccess', event);
      db = event.target.result;
    };
  });

  export function set(key, value) {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.put(value, key);
  }

  export function get(key) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const objectStoreRequest = store.get(key);
      
      objectStoreRequest.onsuccess = (event) => {
        resolve(objectStoreRequest.result);
      };

      objectStoreRequest.onerror = (event) => {
        reject(event.error);
      };
    });
  };

  export function remove(key) {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.delete(key);
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