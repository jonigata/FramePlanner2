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

{#if editing}
  <input
    bind:value
    on:blur="{submit}"
    on:keydown="{keydown}"
    {required}
    use:focus
    style="display: inline-block; width: {containerWidth}px; height: {containerHeight}px;"
  />
{:else}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    bind:this="{container}"
    on:click="{edit}"
    style="display: inline-block;"
  >
    {value}
  </div>
{/if}
<style>
  input {
    border: none;
    background: none;
    font-size: inherit;
    color: inherit;
    font-weight: inherit;
    text-align: inherit;
    box-shadow: none;
    width: 100%;
    height: 100%;
  }
</style>
