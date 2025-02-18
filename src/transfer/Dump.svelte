<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';

  let filesize: number | null = null;

  function handleSubmit() {
    $modalStore[0].response!(true);
    modalStore.close();
  }

  function handleCancel() {
    modalStore.close();
  }
</script>

<div class="card p-4 w-full max-w-lg">
  <h2 class="h2 mb-4">データエクスポート</h2>

  <div class="p-4">
    <p>
      FramePlannerのファイルシステムは、ドメイン（https://frameplanner-e5569.web.app/、
      https://frameplanner.online/、https://frameplanner.manga-farm.online'）ごとにすべて独立しています。
      今まで https://frameplanner-e5569.web.app/ や https://frameplanner.online/ を使っていた方には、
      https://frameplanner.manga-farm.onlinew/ に移行することをおすすめしています。
      その際、今までのサイトでデータをエクスポートし、まんがファームのサイトでインポートをすれば
      今までのデータを引き継ぐことができます。
    </p>
  </div>

  <div class="p-4">
    <h3>エクスポート</h3>
    <p>FramePlannerファイルシステムを、ローカルストレージにアーカイブファイルとしてダウンロードします。</p>
    <p>ローカルストレージの残り容量には十分気をつけてください。ストレージ容量が不足していると、元のファイルを損傷するおそれがあります。</p>
    <p>推定ファイルサイズ： {filesize ?? '計算中'}GB</p>
  </div>

  <div class="flex justify-end gap-2 mt-4">
    <button type="button" class="btn variant-ghost" on:click={handleCancel}>
      キャンセル
    </button>
    <button 
      type="button" 
      class="btn variant-filled-primary"
      on:click={handleSubmit}
    >
      OK
    </button>
  </div>
</div>

<style>
  h2 {
    font-family: '源暎エムゴ';
    font-size: 24px;
    display: flex;
    gap: 8px;
  }
  h3 {
    font-family: '源暎エムゴ';
    font-size: 20px;
    display: flex;
    gap: 8px;
  }
</style>
