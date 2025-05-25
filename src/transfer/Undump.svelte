<script lang="ts">
  import { onMount } from 'svelte';
  import { modalStore } from '@skeletonlabs/skeleton';
  import { toolTip } from '../utils/passiveToolTipStore';
  import dumpRestorePicture from '../assets/dump-restore.webp';

  let dumpFiles: FileList | null;
  let undumpCounter = 5;
  let sourceTitle: string = '';  

  function handleCancel() {
    modalStore.close();
  }

  async function onUndumpCounter() {
    undumpCounter--;
    if (undumpCounter == 0) {
      $modalStore[0].response!(dumpFiles);
    }
  }

  onMount(() => {
    const args = $modalStore[0]?.meta;
    console.log('Dialog mounted, modal store:', args);
    sourceTitle = args.sourceTitle;
  });
</script>

<div class="card p-4 w-full max-w-2xl">
  <h2 class="h2">データ引き継ぎ</h2>

  <div class="variant-ghost-primary p-1 pt-2 m-2 mb-4 rounded">
    <div class="px-4">
      <h3>FramePlannerについて</h3>
      <div class="p-2">
        <p>
          今まで以下のサイトでFramePlannerを使っていた方は、そちらでデータを<b>ダンプ</b>して
          こちらで<b>リストア</b>することによって、ほとんどのデータを引き継ぐことができます。
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
      <p>既存のFramePlannerでダンプしたデータファイルを、まんがファームのFramePlanner(ここ)の<b>{sourceTitle}</b>に<b>リストア</b>します。</p>
      <p>まんがファームのFramePlannerでダンプしたデータファイルもリストア可能です。</p>
    </div>
    <div class="p-2">
      <p>
        こちらのサイトでまんがを作った後にリストアを行うと、
        <span class="text-red-700"><b>こちらで作ったファイルを上書きして消してしまう</b></span>
        ので、移行を行う場合はこちらでファイルを作る前に実行してください。
      </p>
      <p>
        <span class="text-red-700"><b>途中キャンセルはできません</b></span>。
      </p>
      <p>
        危険な操作なので、ファイルを選択してから実行ボタンを5回押すまで実行されません。
      </p>
    </div>
    <div class="p-2">
      <p class="mt-2">ローカルストレージの残り容量には十分気をつけてください。ストレージ容量が不足していると、リストアに失敗するおそれがあります。</p>
    </div>
  </div>

  <div>
    <div class="hbox gap mx-2" style="margin-top: 8px;">
      <b>リストア</b><input accept=".ndjson" bind:files={dumpFiles} id="dump" name="dump" type="file" />
    </div>
  </div>

  <div class="flex justify-end gap-2 mt-4">
    <button type="button" class="btn variant-ghost" on:click={handleCancel}>
      今はやらない
    </button>
    <button 
      type="button" 
      class="btn variant-filled-primary"
      disabled={!dumpFiles}
      on:click={onUndumpCounter} 
      use:toolTip={"0で実行"}
    >
      リストアを実行する {undumpCounter}
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
