<!-- SliderEdit.svelte -->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { RangeSlider } from '@skeletonlabs/skeleton';

  export let value;
  export let required = true;
  export let min=10;
  export let max=100;
  export let showSlider=true;

  const dispatch = createEventDispatcher();
  let editing = false;
  let original;
  let container;
  let containerWidth = 0;
  let containerHeight = 0;
  let textValue = '';

  $: onChangeValue(value);
  function onChangeValue(value) {
    const n = parseInt(textValue, 10);
    if (value != n) {
      textValue = value.toString();
    }
  }

  $: onChangeTextValue(textValue);
  function onChangeTextValue(textValue) {
    const n = parseInt(textValue, 10);
    if (value != n) {
      value = n;
    }
  }

  onMount(() => {
    original = value;
    containerWidth = container.offsetWidth;
    containerHeight = container.offsetHeight;
    textValue = value.toString();
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
    if (event.relatedTarget && event.relatedTarget.closest('.edit-and-slider')) {
      return;
    }
    submit();
  }

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="container"
  bind:this="{container}"
>
  <div class="edit-and-slider" style="width: {containerWidth}px;">
    <div class="edit-box" style="width: {containerWidth}px; height: {containerHeight}px;">
      <input
        bind:value={textValue}
        on:focus="{edit}"
        on:keydown="{keydown}"
        on:blur="{handleBlur}"
        {required}
        class="input"
      />
    </div>
  {#if editing}
    {#if showSlider}
      <RangeSlider
        bind:value
        on:change="{submit}"
        min={min}
        max={max}
        step={1}
        style="width: {containerWidth * 4}px; z-index:9999;"
      />
    {/if}
  {/if}
    </div>
</div>

<style>
  .container {
    display: inline-block;
    position: relative;
    width: 100%;
    height: 100%;
  }
  input {
    background: none;
    font-size: inherit;
    color: inherit;
    font-weight: inherit;
    text-align: inherit;
    box-shadow: none;
    box-sizing: content-box;
  }
  input:not(:focus) {
    border: none;
  }
  .edit-and-slider {
    position: absolute;
    width: 100%;
    height: 80px;
  }
  .edit-box {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }
</style>