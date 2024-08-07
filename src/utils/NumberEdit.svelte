<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import writableDerived from "svelte-writable-derived";
  import Spreader from './Spreader.svelte';

  export let value: number;
  export let min: number = 1;
  export let max: number = 100;
  export let allowDecimal = false;
  export const id = null;

  const dispatch = createEventDispatcher();
  let original: number;

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
    let s = (event.target as HTMLInputElement).value;
    let n = allowDecimal ? parseFloat(s) : parseInt(s, 10);
    n = Math.max(min, Math.min(max, n));
    value = n; // なぜ両方必要なのかわからん
    textValue.set(n.toString());
    submit();
    key++; // undo防止
  }

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<Spreader>
  <div class="edit-box">
    {#key key}
    <input
      type="number"
      bind:value={$textValue}
      on:focus={edit}
      on:keydown={keydown}
      on:blur={handleBlur}
      class="input"
      step={allowDecimal ? 0.01 : 1}
    />
    {/key}
  </div>
</Spreader>

<style>
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
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-grow: 1;
  }

  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }
</style>