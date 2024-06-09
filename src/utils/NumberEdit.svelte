<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import writableDerived from "svelte-writable-derived";

  export let value: number;
  export let min: number = 1;
  export let max: number = 100;
  export let allowDecimal = false;
  export let id = null;

  const dispatch = createEventDispatcher();
  let original: number;
  let container: HTMLDivElement;
  let containerWidth = 0;
  let containerHeight = 0;

  let key = 0; // undo防止

  const valueStore = writable(value);
  $: valueStore.set(value);
  valueStore.subscribe((v) => {
    value = v;
  });
  const textValue = writableDerived(
    valueStore,
    (v: number) => {
      if (v == null) { return ''; }
      let s = allowDecimal ? v.toFixed(2) : v.toString();
      return s;
    },
    (tv: string, old: number) => {
      if (tv == '' || tv == null) { return 0; }
      let n = allowDecimal ? parseFloat(tv) : parseInt(tv, 10);
      return Math.max(min, Math.min(max, n));
    });

  onMount(() => {
    original = value;
    containerWidth = container.offsetWidth;
    containerHeight = container.offsetHeight;
  });

  function edit(event: FocusEvent) {
    (event.target as HTMLInputElement).select();
  }

  function submit() {
    if (value != original) {
      dispatch('submit', value);
    }
  }

  function keydown(event: KeyboardEvent) {
    if (event.key == 'Escape') {
      event.preventDefault();
      value = original;
    }
  }
  
  function handleBlur(event: FocusEvent) {
    if (event.relatedTarget) {
      return;
    }
    submit();
    key++; // undo防止
  }

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="container"
  id={id}
  bind:this={container}
>
  <div class="edit-box" style="width: {containerWidth}px; height: {containerHeight}px;">
    {#key key}
    <input
      type="number"
      bind:value={$textValue}
      on:focus="{edit}"
      on:keydown="{keydown}"
      on:blur="{handleBlur}"
      class="input"
    />
    {/key}
  </div>
</div>

<style>
  .container {
    display: flex;
    position: relative;
    width: 100%;
    height: 100%;
    align-items: center;
  }
  input {
    background: white;
    font-size: inherit;
    color: inherit;
    font-weight: inherit;
    text-align: inherit;
    box-shadow: none;
    box-sizing: content-box;
    border-radius: 2px;
    padding-right: 2px;
    width: 100%;
    height: 100%;
    border: none;
  }
  .edit-box {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-grow: 1;
    height: 100%;
  }

  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }
</style>