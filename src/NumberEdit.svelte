<!-- SliderEdit.svelte -->
<script>
  import { createEventDispatcher, onMount, tick } from 'svelte';

  export let value;
  export let allowDecimal = false;

  const dispatch = createEventDispatcher();
  let editing = false;
  let original;
  let container;
  let containerWidth = 0;
  let containerHeight = 0;
  let textValue = '';

  let key = 0; // undo防止

  $: onChangeValue(value);
  function onChangeValue(value) {
    let s = allowDecimal ? value.toFixed(2) : value.toString();
    if (textValue != s) {
      textValue = s;
    }
  }

  $: onChangeTextValue(textValue);
  function onChangeTextValue(textValue) {
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
    key++; // undo防止
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