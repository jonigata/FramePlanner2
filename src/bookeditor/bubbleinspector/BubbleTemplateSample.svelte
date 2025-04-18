<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { Bubble } from "../../lib/layeredCanvas/dataModels/bubble.js";
  import { drawBubble } from "../../lib/layeredCanvas/tools/draw/bubbleGraphic";
  import type { Vector } from "../../lib/layeredCanvas/tools/geometry/geometry";
  import trashIcon from '../../assets/trash.webp';
  import RenameEdit from "../../utils/RenameEdit.svelte";

  export let size: Vector = [64, 96];
  export let bubble: Bubble;

  let canvas: HTMLCanvasElement;
  let renameEdit: RenameEdit;
  let renaming = false;

  const dispatch = createEventDispatcher();

  onMount(async () => {
    const opts = {...bubble.optionContext};
    const p = bubble.shape;

    console.snapshot(opts);
    opts['tailTip'] = [-size[0]*0.5, size[1]*0.4];
    opts['tailMid'] = [0.5, 0];
    console.snapshot(opts);

    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(size[0] * 0.5, size[1] * 0.5);
    ctx.fillStyle = bubble.fillColor;
    ctx.strokeStyle = 0 < bubble.n_strokeWidth ? bubble.strokeColor : "rgba(0, 0, 0, 0)";
    ctx.lineWidth = bubble.getPhysicalStrokeWidth(size) * 4;
    drawBubble(ctx, "fill", 'sample', [canvas.width - 16, canvas.height - 16], p, opts);
    drawBubble(ctx, "stroke", 'sample', [canvas.width - 16, canvas.height - 16], p, opts);
    ctx.restore();
  });

  function click(e: MouseEvent) {
    console.log('click');
    dispatch('click', e);
  }

  function startRename() {
    console.log("renameFile");
    renameEdit.setFocus();
  }

  function submitRename(e: CustomEvent<string>) {
    console.log("submitRename", e.detail);
    dispatch('rename', { bubble, name: e.detail });
    renaming = false;
  }

</script>

<div class="canvas-container" style="width: {size[0]}px; height: {size[1]}px;">
  <canvas width="{size[0]}px" height="{size[1]}px" bind:this={canvas} on:click={click}/>

  <!-- svelte-ignore a11y-missing-attribute -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <img class="trash" src={trashIcon} on:click={() => dispatch('delete')}/>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="caption" on:click={startRename}>
    <RenameEdit bind:this={renameEdit} bind:editing={renaming} value={bubble.displayName} on:submit={submitRename} minWidth={"0px"}/>
  </div>  
</div>

<style>
  .canvas-container {
    position: relative;
    background-image: linear-gradient(45deg, #b9c 25%, transparent 25%, transparent 75%, #b9c 75%, #b9c),
                      linear-gradient(45deg, #b9c 25%, transparent 25%, transparent 75%, #b9c 75%, #b9c);
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
  }
</style>
