<script lang="ts">
  import { weaverRefreshToken, type WeaverNode } from './weaverStore';
  import '../box.css';
  import { createEventDispatcher } from 'svelte';
  import DOMPurify from 'dompurify';

  const dispatch = createEventDispatcher();

  export let model: WeaverNode;

  let args = null;
  let applyable = false;
  let problems = null;
  let result = null;

  $: args = model.args;
  $: applyable = model.ready;
  $: problems = model.validate();
  $: result = DOMPurify.sanitize(model.data);

  export function refresh() {
    model = model;
  }

  function reset() {
    model.reset();
    refresh();
    $weaverRefreshToken = true;
  }

</script>

<div class="page-container">
  <div class="args">
    <div class="label">{model.label}</div>
    {#each args as arg, index}
      {#if arg.type === 'largetext'}
        <div class="arg">
          <div class="arg-caption">{arg.label}</div>
          <textarea bind:value={model.args[index].value} rows={10} cols={40}/>
        </div>
      {/if}
      {#if arg.type === 'text'}
        <div class="arg">
          <div class="arg-caption">{arg.label}</div>
          <input type="text" bind:value={model.args[index].value}/>
        </div>
      {/if}
      {#if arg.type === 'number'}
        <div class="arg">
          <div class="arg-caption">{arg.label}</div>
          <input type="number" bind:value={model.args[index].value}/>
        </div>
      {/if}
      {#if arg.type === 'boolean'}
        <div class="arg">
          <div class="arg-caption">{arg.label}</div>
          <input type="checkbox" bind:checked={model.args[index].value}/>
        </div>
      {/if}
    {/each}
  </div>

  <div class="hbox gap-4 mt-4 mb-2">
    <div class="problems">
      {#if problems}
        <div class="problems">
          {problems}
        </div>
      {:else}
        {#if result}
          <button class="reset-button" on:click={reset}>
            リセット
          </button>
        {/if}
      {/if}
    </div>
    <button disabled={!applyable} class="apply-button" on:click={() => dispatch("apply", model)}>
      実行
    </button>
  </div>
  {#if result}
    <div class="result">
      {result}
    </div>
  {/if}
</div>

<style lang="postcss">
  .page-container {
    @apply rounded-container-token variant-glass-surface;
    width: 500px;
    display: flex;
    flex-direction: column;
    padding: 8px;
  }
  .label {
    @apply variant-filled-surface rounded-container-token;
    height: 32px;
    cursor: move;
    align-self: stretch;
    margin-bottom: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Noto Sans JP';
    font-size: 16px;
  }
  .args {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .arg {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    min-height: 32px;
  }
  .arg-caption {
    width: 80px;
    min-width: 80px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    font-size: 12px;
  }
  textarea {
    @apply variant-ringed-surface rounded-container-token;
    background-color: white;
    width: 100%;
    height: 400px;
    resize: none;
    font-family: 'Noto Sans JP';
    font-size: 14px;
    padding: 8px;
  }
  input {
    @apply variant-ringed-surface rounded-container-token;
    background-color: white;
    height: 30px;
  }
  .apply-button {
    @apply btn variant-filled;
    width: 90px;
    height: 32px;
    font-family: 'Zen Maru Gothic';
    font-size: 20px;
    padding-top: 2px;
    padding-bottom: 2px;
  }
  .reset-button {
    @apply btn variant-filled-warning;
    width: 90px;
    height: 32px;
    font-family: 'Zen Maru Gothic';
    font-size: 16px;
    padding-top: 2px;
    padding-bottom: 2px;
  }
  .problems {
    width: 100%;
    height: 48px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    color: #844;
    white-space: pre-line;
    text-align: left;
  }
  .result {
    @apply variant-ringed-surface rounded-container-token;
    background-color: white;
    width: 100%;
    height: 400px;
    resize: none;
    font-family: 'Noto Sans JP';
    font-size: 14px;
    padding: 8px;
    text-align: left;
    overflow-y: auto;
    white-space: pre-line;
  }
</style>
