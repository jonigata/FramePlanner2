<script>
  import AdPanel from './AdPanel.svelte';
  import EmbeddedHtml from './EmbeddedHtml.svelte';
  import adsIcon from '../assets/binoculars.png';
  import { shineEffect } from './shineEffect';

  let isOpen = false;

  function togglePanel() {
    isOpen = !isOpen;
  }
</script>

<div class="fixed inset-y-0 right-0 flex items-center z-50">
  <div class="flex flex-col items-end"> <!-- ボタンとパネルをグループ化 -->
    <button
      class="variant-soft-surface rounded-container-token px-4 py-2 rounded border-8 border-gray-400"
      on:click={togglePanel}
      use:shineEffect={{ interval: 1000, duration: 500, enabled: !isOpen }}
    >
      <img src={adsIcon} alt="広告" class="w-12 h-12"/>
    </button>
    <AdPanel {isOpen}>
      <div class="content">
        <EmbeddedHtml app="ads" url="/ads/jonigata/index.html"/>
      </div>
    </AdPanel>
  </div>
</div>

<style>
  .content {
    width: 320px;
    height: 435px;
  }
</style>
