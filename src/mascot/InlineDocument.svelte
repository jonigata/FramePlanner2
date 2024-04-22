<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { RichChatDocument } from "../utils/richChat";

  export let document: RichChatDocument;

  const dispatch = createEventDispatcher();

  function onInput(e) {
    document.text = e.target.innerHTML;
    dispatch('input', document);
  }
</script>

<div class="document-container">
  <div class="document-title">{document.id}</div>
  <div contenteditable="true" class="document variant-soft-surface rounded-container-token" on:input={onInput}>{document.text}</div>
</div>

<style>
  .document-container {
    position: relative;
    width: 80%;
  }
  .document-title {
    position: absolute;
    top: -10px;
    right: 0px;
    color: #000088;
    font-family: 'Dela Gothic One';
    font-size: 12px;
  }
  .document {
    color: var(--color-primary-50);
    font-family: 'Zen Kurenaido';
    word-wrap: break-word;
    padding: 6px;
    align-self: center;
  }
</style>