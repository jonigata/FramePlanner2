<script lang="ts">
  import { derived } from "svelte/store";
  import Drawer from '../../utils/Drawer.svelte'
  import { shapeChooserOpen, chosenShape } from "./shapeStore";
  import BubbleSample from "./BubbleSample.svelte";
  import BubbleTemplateSample from './BubbleTemplateSample.svelte';
  import type { BindId } from "../../lib/filesystem/fileSystem";
  import { fileSystem, loadBubbleFrom } from '../../filemanager/fileManagerStore';
  import { bubbleInspectorTarget } from './bubbleInspectorStore';
  import type { Bubble } from "../../lib/layeredCanvas/dataModels/bubble";

  export let paperWidth = 96;
  export let paperHeight = 96;

  const bubble = derived(bubbleInspectorTarget, (b) => b?.bubble);

  let templateBubbles: [Bubble, BindId][] = [];

  const shapes = [
    "square",
    "rounded",
    "soft",
    "harsh",
    "shout",
    "ellipse",
    "concentration",
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
    $bubble.rotation = b.rotation;
    $bubble.shape = b.shape;
    $bubble.embedded = b.embedded;
    $bubble.fontStyle = b.fontStyle;
    $bubble.fontWeight = b.fontWeight;
    $bubble.n_fontSize = b.n_fontSize;
    $bubble.fontFamily = b.fontFamily;
    $bubble.direction = b.direction;
    $bubble.fontColor = b.fontColor;
    $bubble.fillColor = b.fillColor;
    $bubble.strokeColor = b.strokeColor;
    $bubble.n_strokeWidth = b.n_strokeWidth;
    $bubble.n_outlineWidth = b.n_outlineWidth;
    $bubble.outlineColor = b.outlineColor;
    $bubble.autoNewline = b.autoNewline;
    $bubble.optionContext = b.optionContext;

    if (!e.detail.ctrlKey) {
      $shapeChooserOpen = false;
    }
  }

  async function deleteTemplate(e: CustomEvent<MouseEvent>, bindId: BindId) {
    const root = await $fileSystem.getRoot();
    const folder = (await root.getNodeByName("テンプレート")).asFolder();
    const entry = await folder.getEntry(bindId);
    await folder.unlink(bindId);
    await root.fileSystem.destroyNode(entry[2]);
    await buildTemplateBubbles();
  }

  $: onOpen($shapeChooserOpen);
  async function onOpen(open: boolean) {
    if (open) {
      await buildTemplateBubbles();
    }
  }

  async function buildTemplateBubbles() {
    templateBubbles = [];
    const root = await $fileSystem.getRoot();
    const folder = (await root.getNodeByName("テンプレート")).asFolder();
    const entries = await folder.listEmbodied();
    for (const entry of entries) {
      const bubble = await loadBubbleFrom(entry[2].asFile());
      templateBubbles.push([bubble, entry[0]]);
    }
    console.log(templateBubbles);
    templateBubbles = templateBubbles;
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
          width={paperWidth}
          height={paperHeight}
          shape={s}
          on:click={(e) => chooseShape(e, s)}
        />
      {/each}
      {#each templateBubbles as [bubble, bindId]}
        <BubbleTemplateSample
          width={paperWidth}
          height={paperHeight}
          bubble={bubble}
          on:click={(e) => chooseTemplate(e, bubble)}
          on:delete={(e) => deleteTemplate(e, bindId)}
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
