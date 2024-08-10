<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import bellIcon from '../assets/bell.png';

  const dispatch = createEventDispatcher();

  export let value = '';
  export let waiting = false;
  export let height = 24;
</script>

<div class="textarea-container">
  {#if waiting}
    <div class="waiting rounded-corner-token textarea">
      <ProgressRadial stroke={100} width="w-10"/>
    </div>
  {:else}
    <textarea class="rounded-corner-token textarea h-{height}" bind:value={value}></textarea>
    <div class="icon-container">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img src={bellIcon} alt="AI生成" on:click={() => dispatch('advise', value)}/>
    </div>
  {/if}
</div>        

<style>
  .textarea-container {
    position: relative;
    width: 100%;
  }
  textarea {
    width: 100%;
    padding: 4px;
    font-family: '源暎アンチック';
    font-size: 14px;
  }
  .icon-container {
    position: absolute;
    right: 16px;
    top: 4px;
  }
  img {
    width: 24px;
    height: 24px;
  }
  .waiting {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>