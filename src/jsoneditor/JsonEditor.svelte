<script lang="ts">
  import { draggable } from '@neodrag/svelte';
  import { bodyDragging } from '../uiStore';
  import titleBarIcon from '../assets/json.png';
  import { JSONEditor, toJSONContent, toTextContent, Mode } from 'svelte-jsoneditor';
  import { isJsonEditorOpen, downloadJsonToken, shareJsonToken } from './jsonEditorStore';
  import { tick } from 'svelte';
  import { shareTemplate } from '../firebase';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { makeFilename } from '../lib/layeredCanvas/tools/saveCanvas.js';
  import { type Page, type Revision, revisionEqual, commitBook, incrementRevision } from '../bookeditor/book';
  import { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';
  import { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
  import { mainPage } from '../bookeditor/bookStore';

  let content = { text: "hello" };
  let skipJsonChange = false;
  let pageRevision: Revision | null = null;

  function handleChange(updatedContent: any /*, previousContent, { contentErrors, patchResult }*/) {
    // content is an object { json: JSONValue } | { text: string }
    console.log('Json/handleChange')
    if (skipJsonChange) {
      // console.log("skipJsonChange");
      return;
    }
    content = updatedContent
    try {
      // TODO: 未確認
      const jsonPage = toJSONContent(updatedContent).json as any;
      const page = $mainPage;
      page.frameTree = FrameElement.decompile(jsonPage.frameTree);
      page.bubbles = jsonPage.bubbles.map(b => Bubble.decompile(jsonPage.paperSize, b));
      commitPage(page, "JsonEdit");
      page.paperSize = jsonPage.paperSize;
      page.paperColor = jsonPage.paperColor;
      page.frameColor = jsonPage.frameColor;
      page.frameWidth = jsonPage.frameWidth;
      incrementRevision(page.revision);
      $mainPage = page;
    }
    catch (e) {
      // ユーザーの入力したJSONが不正な場合、握りつぶす
      console.log("invalid json", e);
    }
  }

  function replacer(_key: string, value: number) {
    if (typeof value === 'number' && !Number.isInteger(value)) {
      return parseFloat(value.toFixed(2)); // 小数点以下2桁に制限
    }
    return value;
  }

  $:onUpdateOuterPage($mainPage);
  async function onUpdateOuterPage(page: Page) {
    if (!page) { return; }
    if (revisionEqual(page.revision, pageRevision)) { 
      console.log("%csame revision", "color:white; background-color:orange; padding:2px 4px; border-radius:4px;")
      return; 
    }
    console.log("%cdifferent revision", "color:white; background-color:orange; padding:2px 4px; border-radius:4px;", page.revision, pageRevision)

    skipJsonChange = true;
    pageRevision = {...page.revision};

    const displayPage = {
      frameTree: FrameElement.decompile(page.frameTree),
      bubbles: page.bubbles.map(b => Bubble.decompile(page.paperSize, b)),
      paperSize: page.paperSize,
      paperColor: page.paperColor,
      frameColor: page.frameColor,
      frameWidth: page.frameWidth,
    };
    content = { text: JSON.stringify(displayPage, replacer, 2) };
    await tick(); // hack
    skipJsonChange = false;
  }

  $:onDownloadJsonDocument($downloadJsonToken);
  function onDownloadJsonDocument(t: boolean) {
    if (!t) { return; }

    const jsonString = toTextContent(content).text;
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = makeFilename('json');
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 0);
    $downloadJsonToken = false;
  }

  $:onShareJsonDocument($shareJsonToken);
  async function onShareJsonDocument(t: boolean) {
    if (!t) { return; }

    console.log("onShareJsonDocument");
    const jsonString = toTextContent(content).text;
    const key = await shareTemplate(jsonString);
    const url = new URL(window.location.href);
    const params = url.searchParams;
    params.set('key', key);
    url.search = params.toString();
    const shareUrl = url.toString();
    navigator.clipboard.writeText(shareUrl);
    toastStore.trigger({ message: 'クリップボードにシェアURLをコピーしました', timeout: 1500});
    $shareJsonToken = false;
  }
</script>

{#if $isJsonEditorOpen}
<div class="control-panel variant-glass-surface rounded-container-token vbox" use:draggable={{ handle: '.title-bar' }} style="pointer-events: {$bodyDragging ? 'none' : 'auto'};">
  <div class="title-bar variant-filled-surface rounded-container-token expand"><img class="title-image" src={titleBarIcon} alt="title"/></div>
  <div class="inner expand">
    <JSONEditor {content} mode={Mode.text} onChange={handleChange}/>
  </div>
</div>
{/if}

<style>
  .control-panel {
    position: absolute;
    width: 440px;
    height: 650px;
    display: flex;
    flex-direction: column;
    top: 200px;
    left: 800px;
  }
  .title-bar {
    cursor: move;
    padding: 2px;
    margin: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .title-image {
    width: 32px;
    height: 32px;
  }
  .inner {
    padding: 8px;
    height: 600px;
  }
  .inner :global(.cm-line) {
    text-align: left;
  }
</style>
