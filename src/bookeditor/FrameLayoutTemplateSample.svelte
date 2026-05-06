<script lang="ts">
  import { onMount, createEventDispatcher, onDestroy } from "svelte";
  import { LayeredCanvas, Viewport } from '../lib/layeredCanvas/system/layeredCanvas'
  import { PaperRendererLayer, BubbleRenderMode } from '../lib/layeredCanvas/layers/paperRendererLayer';
  import { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';
  import { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
  import trashIcon from '../assets/trash.webp';
  import RenameEdit from "../utils/RenameEdit.svelte";
  import type { FrameLayoutTemplateData } from '../filemanager/fileManagerStore';

  const dispatch = createEventDispatcher();
  const size: [number, number] = [140, 198];

  export let data: FrameLayoutTemplateData;

  let canvas: HTMLCanvasElement;
  let renameEdit: RenameEdit;
  let renaming = false;

  function onClick() {
    dispatch('click');
  }

  function startRename() {
    renameEdit.setFocus();
  }

  function submitRename(e: CustomEvent<string>) {
    dispatch('rename', { name: e.detail });
    renaming = false;
  }

  onMount(() => {
    const viewport = new Viewport(canvas, () => {});
    const layeredCanvas = new LayeredCanvas(viewport, false);

    const paperRendererLayer = new PaperRendererLayer(false, { bubbleRenderMode: BubbleRenderMode.All });
    layeredCanvas.rootPaper.size = size;
    layeredCanvas.rootPaper.addLayer(paperRendererLayer);

    paperRendererLayer.setFrameTree(FrameElement.compile(data.frameTree));
    const bubbles = data.bubbles.map(b => Bubble.compile(size, b));
    paperRendererLayer.setBubbles(bubbles);
    layeredCanvas.redraw();

    canvas.addEventListener('click', onClick);
  });

  onDestroy(() => {
    if (canvas) canvas.removeEventListener('click', onClick);
  });
</script>

<div class="canvas-container" style="width: {size[0]}px; height: {size[1]}px;">
  <canvas width={size[0]} height={size[1]} bind:this={canvas} on:click={onClick}/>

  <!-- svelte-ignore a11y-missing-attribute -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <img class="trash" src={trashIcon} on:click|stopPropagation={() => dispatch('delete')}/>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="caption" on:click|stopPropagation={startRename}>
    <RenameEdit bind:this={renameEdit} bind:editing={renaming} value={data.displayName} on:submit={submitRename} minWidth={"0px"}/>
  </div>
</div>

<style>
  .canvas-container {
    position: relative;
    background-image: linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc),
                      linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
    background-color: white;
  }
  canvas {
    position: absolute;
    top: 0;
    left: 0;
    cursor: pointer;
  }
  .trash {
    position: absolute;
    top: 0;
    right: 0;
    width: 24px;
    height: 24px;
    cursor: pointer;
  }
  .caption {
    position: absolute;
    font-size: 12px;
    color: rgb(8, 7, 75);
    bottom: 0;
    width: 100%;
    -webkit-text-stroke: 0.4px #ddd;
    font-family: '源暎エムゴ';
    height: 18px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.7);
  }
</style>
