<script lang="ts">
  // 外からvalueが変えられると、textareaの高さが変わる
  // 中で編集しても変わらない

  import { tick } from "svelte";

  export let value = '';
  export let minHeight = 24;
  export let placeholder ='';

  let textarea: HTMLTextAreaElement;

  let internalValue: string | null = null;
  $: onValueChanged(value);
  async function onValueChanged(value: string) {
    if (value === internalValue) return;
    internalValue = value;
    await tick();
    textarea.style.height = (textarea.scrollHeight + 2) + 'px';
  }

  $: if (internalValue != null) {
    value = internalValue;
  }

</script>

<textarea 
  class="rounded-corner-token textarea" 
  style="min-height: {minHeight}px" 
  bind:value={internalValue} 
  bind:this={textarea} 
  placeholder={placeholder}
  on:keydown
></textarea>

<style>
  textarea {
    width: 100%;
    padding: 4px;
    font-family: '源暎アンチック';
    font-size: 14px;
    height: auto;
    max-height: 360px;
  }
</style>