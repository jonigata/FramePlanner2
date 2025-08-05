<script lang="ts">
  import writableDerived from "svelte-writable-derived";
  import Drawer from '../../utils/Drawer.svelte'
  import { shapeChooserOpen, chosenShape } from "./shapeStore";
  import BubbleSample from "./BubbleSample.svelte";
  import BubbleTemplateSample from './BubbleTemplateSample.svelte';
  import type { BindId } from "../../lib/filesystem/fileSystem";
  import { gadgetFileSystem, loadBubbleFrom, saveBubbleTo } from '../../filemanager/fileManagerStore';
  import { bubbleInspectorTarget } from './bubbleInspectorStore';
  import { Bubble } from "../../lib/layeredCanvas/dataModels/bubble";
  import type { Vector } from "../../lib/layeredCanvas/tools/geometry/geometry";
  import { captureException } from "@sentry/svelte";

  export let itemSize: Vector = [64,96];

  const bubble = writableDerived(
    bubbleInspectorTarget,
    (bit) => bit?.bubble,
    (b, bit) => {
      bit!.bubble = b!;
      return bit;
    }
  );

  let templateBubbles: [Bubble, BindId][] = [];

  const shapes = [
    "square",
    "rounded",
    "soft",
    "harsh",
    "shout",
    "ellipse",
    "concentration",
    "thought",
    "polygon",
    "strokes",
    "double-strokes",
    "heart",
    "diamond",
    "arrow",
    "motion-lines",
    "speed-lines",
    "ellipse-mind",
    "soft-mind",
    "rounded-mind",
    "none",
  ];

  function chooseShape(e: CustomEvent<MouseEvent>, s: string) {
    $chosenShape = s;
    if (!e.detail.ctrlKey) {
      $shapeChooserOpen = false;
    }
  }

  function chooseTemplate(e: CustomEvent<MouseEvent>, b: Bubble) {
    if (b.n_fontSize <= 0) {
      captureException(`fontSize is too small, ${JSON.stringify(Bubble.decompile(b))}`);
    }

    console.log(b);
    const q: Bubble = $bubble!;
    q.rotation = b.rotation;
    q.shape = b.shape;
    q.embedded = b.embedded;
    q.fontStyle = b.fontStyle;
    q.fontWeight = b.fontWeight;
    q.n_fontSize = b.n_fontSize;
    q.charSkip = b.charSkip;
    q.lineSkip = b.lineSkip;
    q.fontFamily = b.fontFamily;
    q.direction = b.direction;
    q.fontColor = b.fontColor;
    q.fillColor = b.fillColor;
    q.strokeColor = b.strokeColor;
    q.n_strokeWidth = b.n_strokeWidth;
    q.n_outlineWidth = b.n_outlineWidth;
    q.outlineColor = b.outlineColor;
    q.autoNewline = b.autoNewline;
    q.optionContext = b.optionContext;
    q.rubySize = b.rubySize;
    q.rubyDistance = b.rubyDistance;
    $bubble = q;

    if (!e.detail.ctrlKey) {
      $shapeChooserOpen = false;
    }
  }

  async function deleteTemplate(e: CustomEvent<MouseEvent>, bindId: BindId) {
    const root = await $gadgetFileSystem!.getRoot();
    const folder = (await root.getNodeByName("テンプレート"))!.asFolder()!;
    const entry = await folder.getEntry(bindId);
    await folder.unlink(bindId);
    await root.fileSystem.destroyNode(entry![2]);
    await buildTemplateBubbles();
  }

  $: onOpen($shapeChooserOpen);
  async function onOpen(f: boolean) {
    if (f) {
      await buildTemplateBubbles();
    }
  }

  async function buildTemplateBubbles() {
    templateBubbles = [];
    const paperSize = $bubbleInspectorTarget?.page?.paperSize;
    if (paperSize == null) return;
    const root = await $gadgetFileSystem!.getRoot();
    const folder = (await root.getNodeByName("テンプレート"))!.asFolder()!;
    const entries = await folder.listEmbodied();
    for (const entry of entries) {
      const bubble = await loadBubbleFrom([840, 1188], entry[2].asFile()!); // セーブされたときのドキュメントサイズがわからないので、デフォルト値
      templateBubbles.push([bubble, entry[0]]);
    }
    templateBubbles = templateBubbles;
  }

  async function onRenameBubble(e: CustomEvent<{ bubble: Bubble, name: string }>) {
    const { bubble, name } = e.detail;
    bubble.displayName = name;

    const bindId = templateBubbles.find(([b]) => b === bubble)?.[1];
    if (bindId == null) return;

    const root = await $gadgetFileSystem!.getRoot();
    const folder = (await root.getNodeByName("テンプレート"))!.asFolder()!;
    const file = (await folder.getEmbodiedEntry(bindId))![2].asFile()!;
    await saveBubbleTo(bubble, file);

    console.log(e.detail);
  }
</script>

<div class="drawer-outer">
  <Drawer
    open={$shapeChooserOpen}
    placement="right"
    size="320px"
    on:clickAway={() => ($shapeChooserOpen = false)}
  >
    <div class="drawer-content">
      ctrlキーを押しながらクリックで閉じずに選択
      {#each shapes as s}
        <BubbleSample
          size={itemSize}
          shape={s}
          on:click={(e) => chooseShape(e, s)}
        />
      {/each}
      {#each templateBubbles as [bubble, bindId]}
        <BubbleTemplateSample
          size={itemSize}
          bubble={bubble}
          on:click={(e) => chooseTemplate(e, bubble)}
          on:delete={(e) => deleteTemplate(e, bindId)}
          on:rename={e => onRenameBubble(e)}
        />
      {/each}
    </div>
  </Drawer>
</div>

<style>
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
  .drawer-content {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 16px;
  }
</style>
