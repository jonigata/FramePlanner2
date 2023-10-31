<script lang="ts">
  import type { WeaverNode, WeaverArg } from './weaverStore';
  import { createEventDispatcher, onMount } from 'svelte';

  const dispatch = createEventDispatcher();

  export let arg: WeaverArg;

  let value = arg.value;

  $: onChange(value);
  function onChange(v: any) {
    arg.value = value;
    dispatch('change', arg);
  }
</script>

{#if arg.supplemental}
<details>
  <summary>{arg.label}</summary>
  <div class="arg">
    {#if arg.type === 'largetext'}
      <textarea class="largetext" bind:value={value} rows={10} cols={40}/>
    {/if}
    {#if arg.type === 'smalltext'}
      <textarea class="smalltext" bind:value={value} rows={5} cols={40}/>
    {/if}
    {#if arg.type === 'number'}
      <input type="number" bind:value={value}/>
    {/if}
    {#if arg.type === 'boolean'}
      <input type="checkbox" bind:checked={value}/>
    {/if}
  </div>
</details>
{:else}
<div class="arg">
  <div class="arg-caption">{arg.label}</div>
  {#if arg.type === 'largetext'}
    <textarea class="largetext" bind:value={value} rows={10} cols={40}/>
  {/if}
  {#if arg.type === 'smalltext'}
    <textarea class="smalltext" bind:value={value} rows={5} cols={40}/>
  {/if}
  {#if arg.type === 'number'}
    <input type="number" bind:value={value}/>
  {/if}
  {#if arg.type === 'boolean'}
    <input type="checkbox" bind:checked={value}/>
  {/if}
</div>
{/if}

<style lang="postcss">
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
    resize: none;
    font-family: 'Noto Sans JP';
    font-size: 14px;
    padding: 8px;
  }
  .largetext {
    height: 400px;
  }
  .smalltext {
    height: 100px;
  }
  input {
    @apply variant-ringed-surface rounded-container-token;
    background-color: white;
    height: 30px;
  }
  summary {
    width: 80px;
    min-width: 80px;
    font-size: 12px;
  }
  details[open] > summary::after {
    transform: rotate(90deg);
  }  
</style>