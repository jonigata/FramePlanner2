<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import { FSAFileSystem } from '../lib/filesystem/fsaFileSystem';
  import { ProgressBar } from '@skeletonlabs/skeleton';
  import { buildFileSystem } from "./localFileSystem";
  import { mainBookFileSystem } from './fileManagerStore';

  // 3シーン分の状態
  let step = 0;
  let storageFolder: FileSystemDirectoryHandle | null = null;
  let copyProgress = 0;

  async function makeFileSystem() {
    console.log("copyFileSystem");
    const srcFs = $mainBookFileSystem!;

    const fs = await buildFileSystem(storageFolder!);

    // dumpとundumpを直接接続する形
    copyProgress = 0;
    const readable = await srcFs.dump({ onProgress: p => { console.log("dump:", p); } });
    await fs.undump(readable, { onProgress: p => { copyProgress = p; console.log("undump:", p)} });

    copyProgress = 1;
  }

  async function handleNext() {
    // 状態
    if (step == 0) {
      if (await FSAFileSystem.existsDatabase(storageFolder!)) {
        // skip clone
        step = 2;
      } else {
        step = 1;
      }
    } else {
      step++;
    }

    // 遷移後処理
    if (step == 1) {
      makeFileSystem();
    }
    if (step == 3) {
      $modalStore[0]?.response?.(true);
      modalStore.close();
    }
  }

  function handleCancel() {
    $modalStore[0]?.response?.(false);
    modalStore.close();
  }

  async function selectStorageDirectory() {
    // @ts-ignore
    const handle: FileSystemDirectoryHandle | null = await window.showDirectoryPicker();
    if (!handle) { return; }

    storageFolder = handle;
  }
  
</script>

<div class="card p-4 w-full max-w-lg">
  <h2 class="h2">新規ストレージの作成</h2>

  <div class="variant-ghost-primary p-1 pt-2 m-2 mb-4 rounded">
    <div class="px-4">
      {#if step === 0}
        <h3>フォルダの指定</h3>
        <div class="p-2">
          <p>OS(Windows, Macなど)のフォルダ上にFramePlannerのストレージデータベースを作成します。</p>
          <p>ストレージデータベースを保存するフォルダを指定してください。</p>
          <p>
            <button class="btn-sm w-48 variant-filled" on:click={selectStorageDirectory}>保存フォルダを指定</button>
          </p>
          <p>すでにデータベース作成済みのフォルダを指定した場合、コピーをスキップします。新たにコピーしたい場合は、フォルダを空にするか別のフォルダを指定して再トライしてください。</p>
        </div>
      {:else if step === 1}
        <h3>既存ファイルのコピー</h3>
        <div class="p-2">
          <p>現在のストレージデータベース内のファイルをすべて、新しいストレージデータベースにコピーします。</p>
          <ProgressBar label="Progress Bar" value={copyProgress} max={1} />
        </div>
      {:else if step === 2}
        <h3>完了</h3>
        <div class="p-2">
          <p>準備が完了しました。「完了」を押すと新しいストレージデータベースをデフォルトのデスクトップ・キャビネット領域として設定します。</p>
        </div>
      {/if}
    </div>
  </div>

  <div class="flex justify-between items-center mt-4 px-4">
    <button type="button" class="btn variant-ghost" on:click={handleCancel}>
      キャンセル
    </button>
    <div class="flex gap-2">
      {#if step === 0}
        <button type="button" class="btn variant-filled-primary" on:click={handleNext} disabled={storageFolder == null}>
          作成する
        </button>
      {:else if step === 1}
        <button type="button" class="btn variant-filled-primary" on:click={handleNext} disabled={copyProgress < 1}>
          OK
        </button>
      {:else if step === 2}
        <button type="button" class="btn variant-filled-primary" on:click={handleNext}>
          完了
        </button>
      {/if}
    </div>
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
  .btn[disabled] {
    opacity: 0.5;
    pointer-events: none;
  }
  p {
    margin-bottom: 16px;
  }
</style>