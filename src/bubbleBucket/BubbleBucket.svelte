<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { bubbleBucketPage, bubbleBucketDirty } from './bubbleBucketStore';
  import BubbleBucketItem from './BubbleBucketItem.svelte';
  import { collectPageContents } from '../bookeditor/book';
  import { mainBook } from '../bookeditor/bookStore';
  import { getHaiku } from "../lib/layeredCanvas/tools/haiku";
  import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
  import { getRectCenter } from '../lib/layeredCanvas/tools/geometry/geometry';

  let bubbles = [];

  function setUpBubbles() {
    bubbles = $bubbleBucketPage.bubbles;
  }
  $: if ($bubbleBucketPage != null) {
    setUpBubbles();
  }

  function close() {
    $bubbleBucketPage = null;
    $bubbleBucketDirty = true;
  }

  function onAddBubble() {
    const dir = $mainBook.direction;
    const page = $bubbleBucketPage;
    const frameSeq = collectPageContents(page, 0, dir)
    const contents = frameSeq.contents;

    // 一番番号が若くてbubblesが少ないマスを探す
    let min = 0;
    for (let i = 0; i < contents.length; i++) {
      if (contents[i].bubbles.length < contents[min].bubbles.length) {
        min = i;
      }
    }

    const paperSize = page.paperSize;
    const center = getRectCenter(contents[min].sourceRect);

    const bubble = new Bubble();
    bubble.text = getHaiku();
    bubble.initOptions();
    // bubble.forceEnoughSize(paperSize);
    bubble.setPhysicalCenter(paperSize, center);
    const size = bubble.calculateFitSize(paperSize);
    bubble.setPhysicalSize(paperSize, size);

    $bubbleBucketPage.bubbles.push(bubble);
    $bubbleBucketPage = $bubbleBucketPage;
    $bubbleBucketDirty = true;
  }
</script>

<div class="drawer-outer">
  <Drawer placement={"right"} open={$bubbleBucketPage != null} size="720px" on:clickAway={close}>
    <div class="drawer-content">
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
  }
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
</style>