<script lang="ts">
  import { type IDBPDatabase, openDB } from 'idb';
  import { onMount } from "svelte";
  import { type Writable, writable } from "svelte/store";

  // IndexedDBのデータベース名とストア名を定義
  export let dbName: string;
  export let storeName: string;

  let db: Writable<IDBPDatabase<unknown>> = writable(null);

  // IndexedDBを開く
  onMount(async () => {
    db.set(await openDB(dbName, 2, {
      async upgrade(db) {
        db.createObjectStore(storeName, { keyPath: 'key' });
      }
    }));
  });

  export async function set(key: string, value: string) {
    console.log($db);
    await $db.put(storeName, { key, value });
  }

  export async function get(key: string): Promise<string> {
    const data = await $db.get(storeName, key);
    return data?.value;
  }

  export async function remove(key: string) {
    await $db.delete(storeName, key);
  }

  export async function clear() {
    await $db.clear(storeName);
  }

  export function isReady() {
    return $db !== null;
  }

  export async function waitForReady() {
    return new Promise<void>(
      (resolve) => {
        db.subscribe((v) => {
          if (v) {
            resolve();
          }
        });
      });
  }
  
</script>