<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import type ListBoxItem from './ListBoxItem.svelte';

  setContext('retrieveRegisterer', retrieveRegisterer);
  setContext('onDrop', onDrop);

  function retrieveRegisterer() {
    return {
      register: registerChild,
      unregister: unregisterChild
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

  function onDrop(index: number) {
    console.log("onDrop", index);
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
      console.log(index, y1 - y0, items.map(i => i.getBoundingClientRect().height));
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
</script>

<div class="listbox">
  <slot/>
</div>

<style>
  .listbox {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
  }  
</style>