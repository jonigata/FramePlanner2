<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import dumpRestorePicture from '../assets/dump-restore.png';

  let filesize: string | null = null;

  function handleSubmit() {
    $modalStore[0].response!(true);
    modalStore.close();
  }

  function handleCancel() {
    modalStore.close();
  }
</script>

<div class="card p-4 w-full max-w-lg">
  <h2 class="h2">データ引き継ぎ</h2>

  <div class="variant-ghost-primary p-1 pt-2 m-2 mb-4 rounded">
    <div class="px-4">
      <h3>FramePlannerとまんがファームについて</h3>
      <div class="p-2">
        <p>
          新規サイト<a href="https://manga-farm.online/">まんがファーム</a>のオープンに伴い、
          FramePlannerはまんがファームの「作る」セクションとして<b>リニューアル</b>されます。
          （今まで通り無料で使えます！）
        </p>
      </div>
      <div class="p-2">
        <p>
          そして、今後FramePlannerの既存サイト
        </p>
        <ul>
          <li>https://frameplanner-e5569.web.app/</li>
          <li>https://frameplanner.online/</li>
        </ul>
        <p>
          は基本的に更新されなくなります。
        </p>
      </div>
      <div class="p-2 mb-4">
        <p class="mt-2">
          失いたいくないデータがある場合は、こちらのサイトで<b>ダンプ</b>してファイルをダウンロードし、まんがファームでそのファイルをリストアしてください。
        </p>
      </div>
    </div>
  </div>

  <img src={dumpRestorePicture} alt="データ引き継ぎ" class="w-full mb-4"/>

  <div class="px-4">
    <h3>ダンプ</h3>
    <div class="p-2">
      <p>FramePlannerのデータのほとんどを、ローカルストレージにアーカイブファイルとして<b>ダウンロード</b>します。</p>
      <p class="mt-2">ローカルストレージの残り容量には十分注意してください。ストレージ容量が不足していると、元のファイルを損傷するおそれがあります。</p>
      <p class="mt-2">推定ファイルサイズ： <b>{filesize ?? '計算中'}</b></p>
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
  ul {
    font-size: 16px;
    list-style-type: disc;
    margin-left: 32px;
  }
  b {
    font-family: '源暎エムゴ';
  }
</style>
