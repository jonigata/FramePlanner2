<!-- SliderEdit.svelte -->
<script>
  import { createEventDispatcher, onMount } from 'svelte';

  export let value;

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

  function edit(element) {
    console.log(element.target);
    element.target.select();
    editing = true;
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
  
  function handleBlur(event) {
    if (event.relatedTarget) {
      return;
    }
    submit();
  }

</script>

<div class="container" bind:this="{container}">
  <input
    bind:value
    on:focus="{edit}"
    on:keydown="{keydown}"
    on:blur="{handleBlur}"
    class="input"
  />
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
    border: none;
  }
</style>