<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import AutoSizeTextarea from './AutoSizeTextarea.svelte';
  import { toolTip } from '../utils/passiveToolTipStore';
  import { toastStore } from '@skeletonlabs/skeleton';

  import bellIcon from '../assets/bell.webp';
  import clipboardIcon from '../assets/clipboard.webp';

  const dispatch = createEventDispatcher();

  export let value = '';
  export let waiting = false;
  export let minHeight = 60;
  export let placeholder = '';
  export let cost: number = 0;

  function copyToClipboard() {
    navigator.clipboard.writeText(value);
    toastStore.trigger({ message: 'クリップボードにコピーしました', timeout: 1500});
  }
</script>

<div class="textarea-container">
  {#if waiting}
    <div class="waiting rounded-corner-token textarea" style="min-height: {minHeight}px; height: {minHeight}px;">
      <ProgressRadial stroke={100} width="w-10"/>
    </div>
  {:else}
    <AutoSizeTextarea minHeight={minHeight} bind:value={value} placeholder={placeholder}/>
    <div class="icon-container flex flex-row-reverse gap-2">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img src={bellIcon} alt="カイルちゃん考えて！" on:click={() => dispatch('advise', value)} use:toolTip={`カイルちゃん考えて！[${cost}]`} />
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img src={clipboardIcon} alt="クリップボードにコピー" on:click={copyToClipboard} use:toolTip={"クリップボードにコピー"} />
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
    margin-bottom: 7px;
  }
</style>