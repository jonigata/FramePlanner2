<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import dumpRestorePicture from '../assets/dump-restore.png';

  let filesize: number | null = null;
  let overwrite = '';

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

  <div class="variant-ghost-secondary p-1 pt-2 m-2 mb-4 rounded">
    <div class="px-4">
      <h3>FramePlannerについて</h3>
      <div class="p-2">
        <p>
          今まで以下のサイトでFramePlannerを使っていた方は、そちらでデータを<b>ダンプ</b>して
          こちらで<b>リストア</b>することによって、データを引き継ぐことができます。
        </p>
        <ul>
          <li>https://frameplanner-e5569.web.app/</li>
          <li>https://frameplanner.online/</li>
        </ul>
      </div>
    </div>
  </div>

  <img src={dumpRestorePicture} alt="データ引き継ぎ" class="w-full mb-4"/>

  <div class="px-4">
    <h3>リストア</h3>
    <div class="p-2">
      <p>既存のFramePlannerでダンプしたデータファイルを、まんがファームのFramePlanner(ここ)で<b>リストア</b>します。</p>
    </div>
    <div class="p-2">
      <p>
        こちらのサイトでまんがを作った後にリストアを行うと、
        <span class="text-red-700"><b>こちらで作ったファイルを上書きして消してしまう</b></span>
        ので、移行を行う場合はこちらでファイルを作る前に実行してください。
      </p>
    </div>
    <div class="p-2">
      <p class="mt-2">ローカルストレージの残り容量には十分気をつけてください。ストレージ容量が不足していると、リストアに失敗するおそれがあります。</p>
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
      リストアを実行する
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
    margin-bottom: 4px;
  }
  b {
    font-family: '源暎エムゴ';
  }
</style>
