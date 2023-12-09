<script lang="ts">
  import { weaverRefreshToken, type WeaverNode } from './weaverStore';
  import { getContext } from 'svelte';
  import DOMPurify from 'dompurify';
  import StoryWeaverInspectorArg from './StoryWeaverInspectorArg.svelte';
  import { ProgressRadial, toastStore } from '@skeletonlabs/skeleton';
  import '../box.css';
  import copyIcon from '../assets/clipboard.png';

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

  function copyResult() {
    navigator.clipboard.writeText(result);
    toastStore.trigger({ message: `コピーしました`, timeout: 3000});
  }

  const apply = getContext('apply') as (n: WeaverNode)=>void;
  const fullApply = getContext('fullApply') as (n: WeaverNode)=>void;
  const fullReset = getContext('fullReset') as (n: WeaverNode)=>void;
</script>

<div>
  {#if model.waiting}
  <div class="waiting">
    <ProgressRadial/>
  </div>
  {:else}
    <div class="args">
      {#each args as arg}
        <StoryWeaverInspectorArg arg={arg} on:change={onArgChanged}/>
      {/each}
    </div>

    <div class="hbox gap-2 mt-4 mb-2">
      <button class="reset-button" on:click={() => fullReset(model)}>
        フルリセット
      </button>
      <button class="apply-button" on:click={() => fullApply(model)}>
        フル実行
      </button>
      <div class="single-panel gap-2">
        {#if problems}
          <div class="problems">
            {problems}
          </div>
        {:else}
          {#if result}
            <div class="button-cushion">
              <button class="reset-button" on:click={reset}>
                リセット
              </button>
            </div>
          {/if}
          <button disabled={!applyable} class="apply-button" on:click={() => apply(model)}>
            実行
          </button>
        {/if}
      </div>
    </div>
    {#if result}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="result" on:mousedown={stopPropagation} on:mousemove={stopPropagation} on:mouseup={stopPropagation}>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <img class="copy-button" src={copyIcon} alt="copy" on:click={copyResult}/>
        {result}
      </div>
    {/if}
  {/if}
</div>

<style lang="postcss">
  .args {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .single-panel {
    width: 100%;
    height: 48px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
  }
  .apply-button {
    @apply btn variant-filled;
    width: 90px;
    height: 32px;
    font-family: 'Zen Maru Gothic';
    font-size: 14px;
    padding-top: 2px;
    padding-bottom: 2px;
  }
  .reset-button {
    @apply btn variant-filled-warning;
    width: 90px;
    height: 32px;
    font-family: 'Zen Maru Gothic';
    font-size: 14px;
    padding-top: 2px;
    padding-bottom: 2px;
  }
  .button-cushion {
    height: 48px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .problems {
    width: 100%;
    height: 48px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
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
    position: relative;
  }
  .copy-button {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 1;
    cursor: pointer;
    width: 24px;
    height: 24px;
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
