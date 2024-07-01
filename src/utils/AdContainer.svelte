<script>
  import AdPanel from './AdPanel.svelte';
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
      {isOpen ? '>>' : '<<'}
    </button>
    <AdPanel {isOpen}>
      <div class="content">
        <h2 class="text-xl font-semibold mb-4">メニュー内容</h2>
        <ul class="space-y-2">
          <li class="bg-gray-200 p-2 rounded">項目1</li>
          <li class="bg-gray-200 p-2 rounded">項目2</li>
          <li class="bg-gray-200 p-2 rounded">項目3</li>
        </ul>
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