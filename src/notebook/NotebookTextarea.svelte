<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import AutoSizeTextarea from './AutoSizeTextarea.svelte';

  import bellIcon from '../assets/bell.png';

  const dispatch = createEventDispatcher();

  export let value = '';
  export let waiting = false;
  export let minHeight = 60;

</script>

<div class="textarea-container">
  {#if waiting}
    <div class="waiting rounded-corner-token textarea" style="min-height: {minHeight}px; height: {minHeight}px;">
      <ProgressRadial stroke={100} width="w-10"/>
    </div>
  {:else}
    <AutoSizeTextarea minHeight={minHeight} bind:value={value}/>
    <div class="icon-container">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img src={bellIcon} alt="カイルちゃん考えて！" on:click={() => dispatch('advise', value)}/>
    </div>
  {/if}
</div>        

<style>
  .textarea-container {
    position: relative;
    width: 100%;
  }
  .icon-container {
    position: absolute;
    right: 16px;
    top: -30px;
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