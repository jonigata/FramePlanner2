<script lang="ts">
  import { weaverRefreshToken, type WeaverNode } from './weaverStore';
  import '../box.css';
  import { createEventDispatcher } from 'svelte';
  import DOMPurify from 'dompurify';
  import StoryWeaverInspectorArg from './StoryWeaverInspectorArg.svelte';
  import { Accordion, AccordionItem } from '@skeletonlabs/skeleton';
  import { ProgressRadial } from '@skeletonlabs/skeleton';

  const dispatch = createEventDispatcher();

  export let model: WeaverNode;

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

  function stopPropagation(e: Event) {
    e.stopPropagation();
  }

  function onArgChanged(e: CustomEvent) {
    refresh();
    $weaverRefreshToken = true;
  }

</script>

<div class="page-container">
  {#if model.waiting}
  <div class="label">{model.label}</div>
  <div class="waiting">
    <ProgressRadial/>
  </div>
  {:else}
    <div class="args">
      <div class="label">{model.label}</div>
      {#each args as arg}
        <StoryWeaverInspectorArg arg={arg} on:change={onArgChanged}/>
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
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="result" on:mousedown={stopPropagation} on:mousemove={stopPropagation} on:mouseup={stopPropagation}>
        {result}
      </div>
    {/if}
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
    user-select: text !important;
    cursor: text;
  }
  .waiting {
    width: 100%;
    height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
</style>
