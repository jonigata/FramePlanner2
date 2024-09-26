<script lang="ts">
  import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
  import type { Mode } from '../utils/feathralImaging';
  import feathralIcon from '../assets/feathral.png';
  import { openDB } from 'idb';
  import { onMount } from 'svelte';
  
  function createPersistent<T>(dbName: string, storeName: string, key: string) {
    const dbPromise = openDB(dbName, 1, {
      async upgrade(db) {
        db.createObjectStore(storeName);
      }
    });

    let saved: T = undefined;
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

  export let mode: Mode

  const persistent = createPersistent<Mode>("preferences", "flux", "mode");

  onMount(async () => {
    mode = await persistent.getOrDefault(mode);
  });

  $: persistent.set(mode).then(() => console.log("save done", mode));

</script>

<div class="vbox left gap-2 mode">
  <RadioGroup>
    <RadioItem bind:group={mode} name={"mode"} value={"schnell"}>
      <span>Schnell</span>
      <span class="flex"><img class="inline" src={feathralIcon} alt="feathral" width=24 height=24/>x1</span>
    </RadioItem>
    <RadioItem bind:group={mode} name={"mode"} value={"pro"}>
      <span>Pro</span>
      <span class="flex"><img class="inline" src={feathralIcon} alt="feathral" width=24 height=24/>x10</span>
    </RadioItem>
    <RadioItem bind:group={mode} name={"mode"} value={"chibi"}>
      <span>ちび</span>
      <span class="flex"><img class="inline" src={feathralIcon} alt="feathral" width=24 height=24/>x7</span>
    </RadioItem>
    <RadioItem bind:group={mode} name={"mode"} value={"manga"}>
      <span>まんが</span>
      <span class="flex"><img class="inline" src={feathralIcon} alt="feathral" width=24 height=24/>x7</span>
    </RadioItem>
  </RadioGroup>
</div>

<style>
  .mode :global(.radio-item) {
    width: 88px;
    font-family: '源暎アンチック';
  }  
</style>

