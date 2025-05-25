<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import { onMount } from 'svelte';

  let filesize: string | null = null;
  let sourceTitle: string = '';  

  function handleSubmit() {
    $modalStore[0].response!(true);
    modalStore.close();
  }

  function handleCancel() {
    modalStore.close();
  }

  onMount(() => {
    const args = $modalStore[0]?.meta;
    console.log('Dialog mounted, modal store:', args);
    sourceTitle = args.sourceTitle;
  });
</script>

<div class="card p-4 w-full max-w-lg">
  <div class="px-4">
    <h3>ダンプ</h3>
    <div class="p-2">
      <p>FramePlannerの<b>{sourceTitle}</b>データを、HDDやSSDにアーカイブファイルとして<b>ダウンロード</b>します。</p>
      <p class="mt-2">ローカルストレージの残り容量には十分注意してください。ストレージ容量が不足していると、元のファイルを損傷するおそれがあります。</p>
      <!-- <p class="mt-2">推定ファイルサイズ： <b>{filesize ?? '計算中'}</b></p> -->
    </div>
  </div>

  <div class="flex justify-end gap-2 mt-4">
    <button type="button" class="btn variant-ghost" on:click={handleCancel}>
      今はやらない
    </button>
    <button 
      type="button" 
      class="btn variant-filled-primary"
      on:click={handleSubmit}
    >
      ダンプを実行する
    </button>
  </div>
</div>

<style>
  h3 {
    font-family: '源暎エムゴ';
    font-size: 20px;
    display: flex;
    gap: 8px;
  }
  b {
    font-family: '源暎エムゴ';
  }
</style>
