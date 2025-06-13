<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { bubbleBucketPage, bubbleBucketDirty } from './bubbleBucketStore';
  import BubbleBucketItem from './BubbleBucketItem.svelte';
  import { collectPageContents } from '../lib/book/book';
  import { mainBook } from '../bookeditor/workspaceStore';
  import { getHaiku } from "../lib/layeredCanvas/tools/haiku";
  import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
  import { getRectCenter, sizeToRect } from '../lib/layeredCanvas/tools/geometry/geometry';
  import { onMount } from 'svelte';


  let bubbles: Bubble[] = [];
  let drawerElement: HTMLDivElement;

  function setUpBubbles() {
    bubbles = $bubbleBucketPage!.bubbles;
  }
  $: if ($bubbleBucketPage != null) {
    setUpBubbles();
  }

  function close() {
    $bubbleBucketPage = null;
    $bubbleBucketDirty = true;
  }

  function onAddBubble() {
    const dir = $mainBook!.direction;
    const page = $bubbleBucketPage!;
    const frameSeq = collectPageContents(page, 0, dir)
    const contents = frameSeq.contents;

    let rect;

    if (contents.length == 0) {
      rect = sizeToRect(page.paperSize);
    } else {
      // 一番番号が若くてbubblesが少ないマスを探す
      let min = 0;
      for (let i = 0; i < contents.length; i++) {
        if (contents[i].bubbles.length < contents[min].bubbles.length) {
          min = i;
        }
      }
      rect = contents[min].sourceRect;
    }

    const paperSize = page.paperSize;
    const center = getRectCenter(rect);

    const bubble = new Bubble();
    bubble.text = getHaiku();
    bubble.initOptions();
    // bubble.forceEnoughSize(paperSize);
    bubble.setPhysicalCenter(paperSize, center);
    const size = bubble.calculateFitSize(paperSize);
    bubble.setPhysicalSize(paperSize, size);

    page.bubbles.push(bubble);
    $bubbleBucketPage = page;
    $bubbleBucketDirty = true;
  }

  function addBubbleWithText(text: string) {
    const dir = $mainBook!.direction;
    const page = $bubbleBucketPage!;
    const frameSeq = collectPageContents(page, 0, dir)
    const contents = frameSeq.contents;

    let rect;

    if (contents.length == 0) {
      rect = sizeToRect(page.paperSize);
    } else {
      // 一番番号が若くてbubblesが少ないマスを探す
      let min = 0;
      for (let i = 0; i < contents.length; i++) {
        if (contents[i].bubbles.length < contents[min].bubbles.length) {
          min = i;
        }
      }
      rect = contents[min].sourceRect;
    }

    const paperSize = page.paperSize;
    const center = getRectCenter(rect);

    const bubble = new Bubble();
    bubble.text = text;
    bubble.initOptions();
    bubble.setPhysicalCenter(paperSize, center);
    const size = bubble.calculateFitSize(paperSize);
    bubble.setPhysicalSize(paperSize, size);

    page.bubbles.push(bubble);
    $bubbleBucketPage = page;
    $bubbleBucketDirty = true;
  }

  function handlePaste(event: ClipboardEvent) {
    event.preventDefault();
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const text = clipboardData.getData('text/plain');
    if (!text) return;

    // 空行で分割（連続する改行、\n\n または \r\n\r\n）
    const texts = text.split(/\n\s*\n|\r\n\s*\r\n/).filter(t => t.trim());
    
    if (texts.length === 0) return;

    // 複数のテキストを順番に追加
    texts.forEach(t => {
      addBubbleWithText(t.trim());
    });
  }

  // ドロワーが開いたときにフォーカスを設定
  $: if ($bubbleBucketPage != null && drawerElement) {
    setTimeout(() => {
      drawerElement.focus();
    }, 100);
  }
</script>

<div class="drawer-outer">
  <Drawer placement={"right"} open={$bubbleBucketPage != null} size="720px" on:clickAway={close}>
    <div 
      class="drawer-content"
      bind:this={drawerElement}
      on:paste={handlePaste}
      tabindex="0"
    >
      {#each bubbles as bubble}
        <BubbleBucketItem bubble={bubble} />
      {/each}
      <div>
        <button class="btn variant-filled" on:click={onAddBubble}>+</button>
      </div>
    </div>
  </Drawer>
</div>

<style>
  .drawer-content {
    width: 100%;
    font-family: 'Yu Gothic', sans-serif;
    font-weight: 500;
    text-align: left;
    padding-top: 16px;
    padding-left: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    outline: none;
  }
  .drawer-content:focus {
    outline: 2px solid rgba(var(--color-primary-500), 0.2);
    outline-offset: -2px;
  }
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
</style>