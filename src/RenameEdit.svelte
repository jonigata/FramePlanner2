<!-- SliderEdit.svelte -->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  export let value: string;
  export let editing: boolean = false;

  const dispatch = createEventDispatcher();
  let original: string;
  let container: HTMLDivElement;
  let containerWidth = 0;
  let containerHeight = 0;
  let input: HTMLInputElement;

  let key = 0; // undo防止

  onMount(() => {
    original = value;
    containerWidth = container.offsetWidth;
    containerHeight = container.offsetHeight;
    console.log(containerWidth, containerHeight);
  });

  function edit(event: FocusEvent) {
    console.log(event);
    (event.target as HTMLInputElement).select();
  }

  function submit() {
    console.log("submit", value, original)
    if (value != original) {
      dispatch('submit', value);
    }
  }

  function keypress(event: KeyboardEvent) {
    if (event.key == 'Enter') {
      input.blur();
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
    editing = false;
    key++; // undo防止
  }

  export function setFocus() {
    console.log("setFocus");
    input.inert = false;
    input.focus();
    editing = true;
  }

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="container"
  bind:this="{container}"
>
  <div class="edit-box" style="width: {containerWidth}px; height: {containerHeight}px;">
    {#key key}
    <input
      inert
      bind:this={input}
      bind:value={value}
      on:focus={edit}
      on:keypress={keypress}
      on:keydown={keydown}
      on:blur={handleBlur}
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
    background: #fff0;
    font-size: inherit;
    color: inherit;
    font-weight: inherit;
    text-align: inherit;
    box-shadow: none;
    box-sizing: content-box;
    border-radius: 2px;
    padding-left: 2px;
    padding-bottom: 2px;
    width: 100%;
    height: 100%;
    border: none;
  }
  .input:focus {
    z-index: 1;
  }
  .edit-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
</style>