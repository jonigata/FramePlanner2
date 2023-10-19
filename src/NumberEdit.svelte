<!-- SliderEdit.svelte -->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  export let value: number;
  export let allowDecimal = false;
  export let id = null;

  const dispatch = createEventDispatcher();
  let original: number;
  let container: HTMLDivElement;
  let containerWidth = 0;
  let containerHeight = 0;
  let textValue = '';

  let key = 0; // undo防止

  $: onChangeValue(value);
  function onChangeValue(value: number) {
    if (!value) { return; }
    let s = allowDecimal ? value.toFixed(2) : value.toString();
    if (textValue != s) {
      textValue = s;
    }
  }

  $: onChangeTextValue(textValue);
  function onChangeTextValue(textValue: string) {
    let n = allowDecimal ? parseFloat(textValue) : parseInt(textValue, 10);
    if (value != n) {
      value = n;
    }
  }

  onMount(() => {
    original = value;
    containerWidth = container.offsetWidth;
    containerHeight = container.offsetHeight;
    textValue = value.toString();
    console.log(containerWidth, containerHeight);
  });

  function edit(event: FocusEvent) {
    console.log(event);
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
      bind:value={textValue}
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
    width: 100%;
    height: 100%;
  }
</style>