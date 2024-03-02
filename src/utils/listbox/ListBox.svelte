<script lang="ts">
  import { createEventDispatcher, setContext, onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import type ListBoxItem from './ListBoxItem.svelte';
  import ListBoxInsertZone from './ListBoxInsertZone.svelte';

  const dispatch = createEventDispatcher();

  let tailZoneHeight = 0;
  let tailZone;

  setContext('retrieveHandlers', retrieveHandlers);

  function retrieveHandlers() {
    return {
      register: registerChild,
      unregister: unregisterChild,
    };
  }

  let items: {item:HTMLElement, zone:HTMLElement}[] = [];
  function registerChild(item, zone) {
    let index = items.length;
    items.push({item, zone});
    return {
      index,
      zoneHeight: getZoneHeight(index),
      gap: getGap(index)
    };
  };

  function unregisterChild(item) {
    let index = items.findIndex(i => i.item === item);
    items.splice(index, 1);
  }

  function onDragOver(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
  }

  async function onDrop(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();

    const index = getItemIndexAt(ev.clientX, ev.clientY);
    const dt = ev.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      if (0 <= index) {
        dispatch("import", { index, files });
      }
    } else {
      const sourceIndex = parseInt(dt.getData("text/list-item"));
      dispatch("move", { index, sourceIndex });
    }
  }

  function getItemIndexAt(x: number, y: number) {
    var index = 0;
    for (let entry of items) {
      const zone = entry.zone;
      if (zone) {
        const rect = zone.getBoundingClientRect();
        if (isPointInRect(x, y, rect)) {
          return index;
        }
      }
      index++;
    }
    if (isPointInRect(x, y, tailZone.getBoundingClientRect())) {
      return items.length;
    }
    return -1;
  }

  function isPointInRect(x: number, y: number, rect: DOMRect) {
    return rect.left < x && x < rect.right && rect.top < y && y < rect.bottom;
  }


/*
  function onImport(a: { index: number, files: FileList}) {
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
*/


  function getZoneHeight(index: number) {
    if (index === 0) {
      const r = items[0].item.getBoundingClientRect();
      return r.height / 2;
    } else {
      const r0 = items[index - 1].item.getBoundingClientRect();
      const r1 = items[index].item.getBoundingClientRect();
      const y0 = r0.top + r0.height / 2;
      const y1 = r1.top + r1.height / 2;
      return y1 - y0;
    }
  }

  function getGap(index: number) {
    if (index === 0) {
      return 0;
    } else {
      const r0 = items[index - 1].item.getBoundingClientRect();
      const r1 = items[index].item.getBoundingClientRect();
      return r1.top - r0.bottom;
    }
  }


  onMount(() => {
    tailZoneHeight = items.length === 0 ? 0 : items[items.length - 1].item.getBoundingClientRect().height / 2;
  });
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="listbox" on:dragover={onDragOver} on:drop={onDrop}>
  <slot/>
  <div class="tail">
    <ListBoxInsertZone zoneHeight={tailZoneHeight} insertPosition={0} bind:zone={tailZone}/>
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