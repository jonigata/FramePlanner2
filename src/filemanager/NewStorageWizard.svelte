<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import { ProgressBar } from '@skeletonlabs/skeleton';
  import { createPreference, type FileSystemPreference } from '../preferences';
  import { buildFileSystem, fileSystemExists } from './localFileSystem';
  import { _ } from 'svelte-i18n';

  // 3シーン分の状態
  let step = 0;
  let storageFolder: FileSystemDirectoryHandle | null = null;
  let copyProgress = 0;
  let reuse = false;

  async function makeFileSystem() {
    copyProgress = 0.01;
    await buildFileSystem(storageFolder!);
    copyProgress = 1;
  }

  async function handleNext() {
    // 状態
    if (step == 0) {
      if (reuse) {
        // skip clone
        step = 2;
      } else {
        step = 1;
      }
    } else if (step == 1) {
      await makeFileSystem();
      step++;
    } else {
      step++;
    }

    // 遷移後処理
    if (step == 3) {
      const pref = createPreference<FileSystemPreference>("filesystem", "current");
      pref.set({type: "fsa", handle: storageFolder!});
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
    let handle: FileSystemDirectoryHandle;
    try {
      handle = await (window as any).showDirectoryPicker();
    }
    catch(e) {
      // perhaps cancel
      console.log("canceled");
      return;
    }


    storageFolder = handle;
    reuse = await fileSystemExists(storageFolder);
  }
  
</script>

<div class="card p-4 w-full max-w-lg">
  <h2 class="h2">{$_('fileManager.newLocalStorageCreation')}</h2>

  <div class="variant-ghost-primary p-1 pt-2 m-2 mb-4 rounded">
    <div class="px-4">
      {#if step === 0}
        <h3>{$_('fileManager.folderSpecification')}</h3>
        <div class="p-2">
          <p>{$_('fileManager.folderSpecificationDescription')}</p>
          <p>{$_('fileManager.selectEmptyFolder')}</p>
          <p>
            <button class="btn-sm w-48 variant-filled" on:click={selectStorageDirectory}>{$_('storage.selectSaveFolder')}</button>
          </p>
          <p>{$_('fileManager.reuseExistingDatabase')}</p>
        </div>
      {:else if step === 1}
        <h3>{$_('fileManager.initialization')}</h3>
        <div class="p-2">
          <p>{$_('fileManager.initializationDescription')}</p>
          <p class="warning">
            {$_('fileManager.initializationWarning')}
          </p>
          <ProgressBar label={$_('fileManager.progressBar')} value={copyProgress} max={1} />
        </div>
      {:else if step === 2}
        <h3>{$_('fileManager.complete')}</h3>
        <div class="p-2">
          <p>{$_('fileManager.completeDescription')}</p>
        </div>
      {/if}
    </div>
  </div>

  <div class="flex justify-between items-center mt-4 px-4">
    <button type="button" class="btn variant-ghost" on:click={handleCancel}>
      {$_('fileManager.cancel')}
    </button>
    <div class="flex gap-2">
      {#if step === 0}
        <button type="button" class="btn variant-filled-primary" on:click={handleNext} disabled={storageFolder == null}>
          {reuse ? $_('fileManager.reuse') : $_('fileManager.create')}
        </button>
      {:else if step === 1}
        <button type="button" class="btn variant-filled-primary" on:click={handleNext} disabled={0 < copyProgress}>
          {$_('fileManager.ok')}
        </button>
      {:else if step === 2}
        <button type="button" class="btn variant-filled-primary" on:click={handleNext}>
          {$_('fileManager.complete')}
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
  .warning {
    color: red;
  }
</style>