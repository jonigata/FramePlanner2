<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { downloaderOpen } from './downloaderStore';
  import downloadIcon from '../assets/get.png';
  import clipboardIcon from '../assets/clipboard.png';
  import aiPictorsIcon from '../assets/aipictors_logo_0.png'
  import { getAnalytics, logEvent } from "firebase/analytics";
  import { commitIfDirtyToken } from '../undoStore';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { type BookArchiveOperation, bookArchiver } from "../utils/bookArchiverStore";
  import { shareBookToken } from '../filemanager/fileManagerStore';
  import { mainBook } from '../bookeditor/bookStore';

  const buttons = [
    {icon: downloadIcon, label: "ダウンロード", onClick: download},
    {icon: clipboardIcon, label: "クリップボードにコピー", onClick: copyToClipboard},
    {icon: aiPictorsIcon, label: "に投稿", onClick: postAIPictors},
    {label: "PSDでエクスポート", onClick: downloadPSD},
    {label: "シェア", onClick: shareBook},
  ];  

  function archive(op: BookArchiveOperation) {
    $bookArchiver.push(op);
    $bookArchiver = $bookArchiver;
  }

  function download() {
    logEvent(getAnalytics(), 'download');
    archive('download');
  }

  function postAIPictors() {
    logEvent(getAnalytics(), 'post_to_aipictors');
    archive('aipictors');
  }

  function copyToClipboard() {
    logEvent(getAnalytics(), 'copy_book_to_clipboard');
    archive('copy');
    toastStore.trigger({ message: 'クリップボードにコピーしました', timeout: 1500});

  }

  async function downloadPSD() {
    logEvent(getAnalytics(), 'export_psd');
    archive('export-psd');
  }

  async function shareBook() {
    $commitIfDirtyToken = true;
    $shareBookToken = $mainBook;
  }

</script>

<div class="drawer-outer">
  <Drawer placement="right" open={$downloaderOpen} size="300px" on:clickAway={() => $downloaderOpen = false}>
    <div class="drawer-content">
      <div class="flex flex-col gap-2 m-2">
        {#each buttons as {icon, label, onClick}}
          <button
            class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 w-fill h-12 flex items-center justify-center gap-2"
            on:click={() => onClick()}
          >
            {#if icon != null}
              <img src={icon} alt={label} class="h-8 w-auto"/>
            {/if}            
            {#if label != null}
              {label}
            {/if}
          </button>
        {/each}
      </div>
    </div>
  </Drawer>
</div>

<style>
  .drawer-content {
    width: 100%;
    height: 100%;
    padding: 16px;
  }
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
</style>