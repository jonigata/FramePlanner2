<script>
  import AdPanel from './AdPanel.svelte';
  import EmbeddedHtml from './EmbeddedHtml.svelte';

  let isOpen = false;
  function togglePanel() {
    isOpen = !isOpen;
  }
</script>

<div class="fixed inset-y-0 right-0 flex items-center z-50">
  <div class="flex flex-col items-end"> <!-- ボタンとパネルをグループ化 -->
    <button
      class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 mb-2"
      on:click={togglePanel}
    >
    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 8L12 14L22 8L12 2Z" />
      <path d="M2 14L12 20L22 14" />
    </svg>
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