<script lang="ts">
  import AdPanel from './AdPanel.svelte';
  import EmbeddedHtml from '../EmbeddedHtml.svelte';
  import { shineEffect } from '../shineEffect';
  import { toolTip } from '../passiveToolTipStore';

  import adsIcon from '../../assets/binoculars.png';
  import leaveIcon from '../../assets/ads-leave.png';

  export let advertiser: string = "jonigata";

  let isOpen = true;
  let reload = false;

  function togglePanel() {
    if (!isOpen) {
      reload = true;
    }
    isOpen = !isOpen;
  }
</script>

<div class="fixed inset-y-0 right-0 flex items-center z-50 pointer-events-none">
  <div class="flex flex-col items-end"> <!-- ボタンとパネルをグループ化 -->
    <AdPanel {isOpen}>
      <div class="content">
        <EmbeddedHtml app="ads" url="/ads/{advertiser}/index.html" bind:reload={reload}/>
      </div>
    </AdPanel>
    <button
      class="variant-soft-surface rounded-container-token px-3 py-1 rounded border-8 border-gray-400 pointer-events-auto"
      on:click={togglePanel}
      use:shineEffect={{ interval: 10000, duration: 500, enabled: !isOpen }}
    >
      {#if isOpen}
        <img src={leaveIcon} alt="閉じる" class="w-8 h-8" use:toolTip={"閉じる"}/>
      {:else}
        <img src={adsIcon} alt="広告" class="w-8 h-8" use:toolTip={"広告"}/>
      {/if}
    </button>
  </div>
</div>

<style>
  .content {
    width: 340px;
    height: 520px;
  }
</style>
