<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  export let value: string;
  export let editing: boolean = false;

  const dispatch = createEventDispatcher();
  let original: string;
  let input: HTMLSpanElement;

  let key = 0; // undo防止

  onMount(() => {
    original = value;
  });

  function edit(event: FocusEvent) {
    console.log(event);
    selectContentOfElement(event.target);
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

  function selectContentOfElement(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  export function setFocus() {
    console.log("setFocus");
    input.contentEditable = "plaintext-only";
    input.focus();
    editing = true;
  }

</script>

<div class="edit-box">
  {#key key}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <span
    contenteditable="false" 
    bind:textContent={value}
    bind:this={input}
    on:focus={edit}
    on:keypress={keypress}
    on:keydown={keydown}
    on:blur={handleBlur}
    class="editable"
  />
  {/key}
</div>

<style>
  .edit-box {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }
  .editable {
    background: #fff0;
    box-shadow: none;
    box-sizing: content-box;
    border-radius: 2px;
    padding-left: 2px;
    border: none;
    min-width: 40px;
    line-height: 1;
  }
  .editable:focus {
    z-index: 1;
  }
</style>