<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { downloaderOpen } from './downloaderStore';
  import downloadIcon from '../assets/get.png';
  import clipboardIcon from '../assets/clipboard.png';
  import aiPictorsIcon from '../assets/aipictors_logo_0.png'
  import { getAnalytics, logEvent } from "firebase/analytics";
  import { toastStore } from '@skeletonlabs/skeleton';
  import { type BookArchiveOperation, bookArchiver } from "../utils/bookArchiverStore";
  import { toolTip } from '../utils/passiveToolTipStore';

  const buttons = [
    {icon: downloadIcon, label: "ダウンロード", onClick: download, hint: "画像としてダウンロードします\n対象ページが複数の場合はzipファイルになります"},
    {icon: clipboardIcon, label: "クリップボードにコピー", onClick: copyToClipboard, hint: "クリップボードにコピーします\n対象ページが複数の場合は最初のページのみ"},
    // {icon: aiPictorsIcon, label: "に投稿", onClick: postAIPictors, hint: "aiPictorsに投稿します"},
    {label: "PSDでエクスポート", onClick: downloadPSD, hint: "PSDファイルとしてダウンロードします\n対象ページが複数の場合はzipファイルになります"},
    {label: "シェア", onClick: shareBook, hint: "ドキュメントのコピーを\n編集できる形でアップロードします"},
    {label: "パッケージ", onClick: downloadEnvelop, hint: "ドキュメントを1つのファイルとして\nダウンロードします"},
    {label: "プロンプトをクリップボードにコピー", onClick: exportPrompts, hint: "各コマのプロンプトを集めてクリップボードにコピーします"},
    {label: "まんがファームに投稿！", onClick: publishEnvelope, hint: "ドキュメントをまんがファームに公開し、\n誰でも閲覧できるようにします"},
    // {label: "test", onClick: testIt }
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
    logEvent(getAnalytics(), 'share_book');
    archive('share-book');
  }

  async function downloadEnvelop() {
    logEvent(getAnalytics(), 'download_envelop');
    archive('envelope');
  }

  async function exportPrompts() {
    logEvent(getAnalytics(), 'export_prompts');
    archive('export-prompts');
    toastStore.trigger({ message: 'クリップボードにコピーしました', timeout: 1500});
  }

  async function publishEnvelope() {
    logEvent(getAnalytics(), 'publish_envelop');
    archive('publish');
  }

  function testIt() {
    const downloadUrl = 'https://frameplanner-e5569.web.app/viewer.html?envelope=01JBH992N5FKAM6T02GJ92ETKY'
    toastStore.trigger({ message: `<a target="_blank" href="${downloadUrl}"><span class="text-yellow-200">公開URL</span></a>がクリップボードにコピーされました`, timeout: 10000});
  }

</script>

<div class="drawer-outer">
  <Drawer placement="right" open={$downloaderOpen} size="300px" on:clickAway={() => $downloaderOpen = false}>
    <div class="drawer-content">
      <div class="flex flex-col gap-2 m-2">
        {#each buttons as {icon, label, hint, onClick}}
          <button
            class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 w-fill h-12 flex items-center justify-center gap-2"
            on:click={() => onClick()}
            use:toolTip={hint}
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
      <span class="text-xs text-slate-800">
      ※対象ページとは、マークされたページがある場合はそれを、ない場合はすべてのページを指します。対象ページが複数の場合の挙動は機能によって違うので、ヒントを参照してください。
      </span>
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