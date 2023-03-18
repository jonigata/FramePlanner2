<script>
  import { createEventDispatcher, onMount } from 'svelte';

  export let value;
  export let required = true;

  const dispatch = createEventDispatcher();
  let editing = false;
  let original;
  let container;
  let containerWidth = 0;
  let containerHeight = 0;

  onMount(() => {
    original = value;
    containerWidth = container.offsetWidth;
    containerHeight = container.offsetHeight;
  });

  function edit() {
    editing = true;
    containerWidth = container.offsetWidth;
    containerHeight = container.offsetHeight;
  }

  function submit() {
    if (value != original) {
      dispatch('submit', value);
    }

    editing = false;
  }

  function keydown(event) {
    if (event.key == 'Escape') {
      event.preventDefault();
      value = original;
      editing = false;
    }
  }

  function focus(element) {
    element.focus();
    element.select();
  }

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="container"
  bind:this="{container}"
  style="position: relative; display: inline-block;"
  on:click="{edit}"
>
  {#if editing}
    <input
      bind:value
      on:blur="{submit}"
      on:keydown="{keydown}"
      {required}
      use:focus
      class="input"
      style="width: {containerWidth}px; height: {containerHeight}px; position: absolute; top: -13px; left: 0;"
    />
  {:else}
    {value}
  {/if}
</div>

<style>
  input {
    border: none;
    background: none;
    font-size: inherit;
    color: inherit;
    font-weight: inherit;
    text-align: inherit;
    box-shadow: none;
    padding-right: 8px;
    box-sizing: content-box;
  }
</style>