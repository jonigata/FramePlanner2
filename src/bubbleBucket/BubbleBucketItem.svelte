<script lang="ts">
  import type { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
  import { redrawToken } from '../bookeditor/bookStore';
  import { onMount, tick } from 'svelte';

  export let bubble: Bubble;
  let text;
  let textarea;

  function autoResize() {
    textarea.style.height = 'auto'; // 高さを一旦リセット
    textarea.style.height = (textarea.scrollHeight+2) + 'px'; // スクロール高さに基づいて高さを再設定
  }

  function onInput(event) {
    bubble.text = event.target.value; // textareaのvalueプロパティからテキストを取得
    $redrawToken = true;
    autoResize(); // 自動リサイズ機能を呼び出し
  }

  onMount(async () => {
    text = bubble.text;
    await tick();
    autoResize();
  });
</script>

<div class="bubblet-container">
  <textarea class="bubblet variant-soft-surface rounded-container-token" bind:value={text} on:input={onInput} bind:this={textarea}></textarea>
</div>

<style>
  .bubblet-container {
    position: relative;
    width: 80%;
    padding: 6px;
  }
  .bubblet {
    color: var(--color-primary-50);
    font-family: 'Zen Kurenaido';
    word-wrap: break-word;
    width: 100%;
    height: 150px;
    border: none;
    resize: none;
    overflow: auto;
    white-space: pre-wrap;
    outline: none;
    box-shadow: none;
  }
</style>
