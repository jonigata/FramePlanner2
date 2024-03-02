<script lang="ts">
  import { createEventDispatcher, setContext, onMount } from 'svelte';
  import type ListBoxItem from './ListBoxItem.svelte';
  import ListBoxInsertZone from './ListBoxInsertZone.svelte';

  const dispatch = createEventDispatcher();

  setContext('retrieveHandlers', retrieveHandlers);

  function retrieveHandlers() {
    return {
      register: registerChild,
      unregister: unregisterChild,
      onImport: onImport,
      onMove: onMove,
    };
  }

  let items: ListBoxItem[] = [];
  function registerChild(item) {
    let index = items.length;
    items.push(item);
    return {
      index,
      zoneHeight: getZoneHeight(index),
      gap: getGap(index)
    };
  };

  function unregisterChild(item) {
    let index = items.indexOf(item);
    items.splice(index, 1);
  }

  function onImport(a: { index: number, files: FileList}) {
    console.log("onImport", a);
    dispatch("import", a);
  }

  function onMove(a: { index: number, sourceIndex: number}) {
    dispatch("move", a);
  }

  function onImportAtTail(e: CustomEvent<FileList>) {
    dispatch("import", { index: items.length, files: e.detail });
  }

  function onMoveToTail(e: CustomEvent<number>) {
    dispatch("move", { index: items.length, sourceIndex: e.detail });
  }


  function getZoneHeight(index: number) {
    if (index === 0) {
      const r = items[0].getBoundingClientRect();
      return r.height / 2;
    } else {
      const r0 = items[index - 1].getBoundingClientRect();
      const r1 = items[index].getBoundingClientRect();
      const y0 = r0.top + r0.height / 2;
      const y1 = r1.top + r1.height / 2;
      return y1 - y0;
    }
  }

  function getGap(index: number) {
    if (index === 0) {
      return 0;
    } else {
      const r0 = items[index - 1].getBoundingClientRect();
      const r1 = items[index].getBoundingClientRect();
      return r1.top - r0.bottom;
    }
  }

  let tailZoneHeight = 0;

  onMount(() => {
    tailZoneHeight = items.length === 0 ? 0 : items[items.length - 1].getBoundingClientRect().height / 2;
  });
</script>

<div class="listbox">
  <slot/>
  <div class="tail">
    <ListBoxInsertZone zoneHeight={tailZoneHeight} insertPosition={0} on:import={onImportAtTail} on:move={onMoveToTail}/>
  </div>
</div>

<style>
  .listbox {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    position: relative;
  }  
  .tail {
    position: absolute;
    width: 100%;
    height: 0px;
    bottom: 0;
  }
</style>