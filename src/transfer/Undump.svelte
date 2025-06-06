<script lang="ts">
  import { onMount } from 'svelte';
  import { modalStore, toastStore } from '@skeletonlabs/skeleton';
  import { toolTip } from '../utils/passiveToolTipStore';
  import dumpRestorePicture from '../assets/dump-restore.webp';
  import { _ } from 'svelte-i18n';

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

  // ファイル選択時の検証
  $: if (dumpFiles && dumpFiles.length > 0) {
    const file = dumpFiles[0];
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.envelope')) {
      toastStore.trigger({
        message: $_('undump.envelopeNotSupported'),
        timeout: 5000
      });
      dumpFiles = null;
    } else if (!fileName.endsWith('.ndjson')) {
      toastStore.trigger({
        message: $_('undump.invalidFileType'),
        timeout: 3000
      });
      dumpFiles = null;
    }
  }
</script>

<div class="card p-4 w-full max-w-2xl">
  <h2 class="h2">{$_('undump.title')}</h2>

  <div class="variant-ghost-primary p-1 pt-2 m-2 mb-4 rounded">
    <div class="px-4">
      <h3>FramePlanner</h3>
      <div class="p-2">
        <p>{$_('undump.description')}</p>
        <ul>
          <li>https://frameplanner-e5569.web.app/</li>
          <li>https://frameplanner.online/</li>
        </ul>
      </div>
    </div>
  </div>

  <img src={dumpRestorePicture} alt={$_('undump.altText')} class="w-full mb-4"/>

  <div class="px-4">
    <h3>{$_('undump.title')}</h3>
    <div class="p-2">
      <p><span class="text-red-700"><b>{$_('undump.warning')}</b></span></p>
    </div>
    <div class="p-2">
      <p class="mt-2">{$_('undump.storageWarning')}</p>
    </div>
  </div>

  <div>
    <div class="mx-2" style="margin-top: 8px;">
      <b>{$_('undump.selectFile')}</b>
      <div class="mt-2">
        <input 
          accept=".ndjson" 
          bind:files={dumpFiles} 
          id="dump" 
          name="dump" 
          type="file" 
          class="hidden"
        />
        <button 
          type="button"
          class="btn variant-outline-primary"
          on:click={() => document.getElementById('dump')?.click()}
        >
          {$_('undump.chooseFile')}
        </button>
        <span class="ml-2 text-sm">
          {dumpFiles && dumpFiles.length > 0 ? dumpFiles[0].name : $_('undump.noFileSelected')}
        </span>
      </div>
    </div>
  </div>

  <div class="flex justify-end gap-2 mt-4">
    <button type="button" class="btn variant-ghost" on:click={handleCancel}>
      {$_('undump.cancel')}
    </button>
    <button 
      type="button" 
      class="btn variant-filled-primary"
      disabled={!dumpFiles}
      on:click={onUndumpCounter} 
      use:toolTip={$_('undump.tooltipExecute')}
    >
      {$_('undump.startRestore')} {undumpCounter}
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
