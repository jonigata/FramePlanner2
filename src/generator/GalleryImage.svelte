<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import { imageGeneratorTarget } from "./imageGeneratorStore";
  import drop from '../assets/drop.png';
  import reference from '../assets/reference.png';
  import referenceSelected from '../assets/reference-selected.png';

  export let canvas: HTMLCanvasElement = null;
  export let width = 160;
  export let chosen: HTMLCanvasElement = null;
  export let refered: HTMLCanvasElement = null;

  let container: HTMLDivElement;
  let height: number = 160;

  const dispatch = createEventDispatcher();

  $: onCanvasChanged(canvas);
  function onCanvasChanged(c: HTMLCanvasElement) {
    if (c) {
      height = getHeight();
    }
  }

  function onClick() {
    console.log("onClick");
    if (chosen === canvas) {
      dispatch("commit", canvas);
      return;
    }
    chosen = canvas;
  }

  function onDelete(e: MouseEvent, canvas: HTMLCanvasElement) {
    console.log("onDelete");
    e.stopPropagation();
    dispatch("delete", canvas);
  }

  function onRefer(e: MouseEvent, canvas: HTMLCanvasElement) {
    console.log("onRefer");
    e.stopPropagation();
    refered = refered === canvas ? null : canvas;
  }

  function onDragStart(e: DragEvent) {
    console.log("onDragStart");
    dispatch("dragstart", canvas);
  }

  // fix aspect ratio
  function getHeight() {
    console.log(canvas.width, canvas.height);
    return (canvas.height / canvas.width) * width;
  }

  onMount(() => {
    console.log("change image size", canvas.width, canvas.height, $imageGeneratorTarget);
    container.appendChild(canvas);
    canvas.ondragstart = onDragStart;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
  });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="frame" class:selected={chosen === canvas} bind:this={container} on:click={onClick} style="width: {width}px; height: {height}px;">
  <div class="delete-button" on:click={e => onDelete(e, canvas)}>
    <img src={drop} alt="delete" />
  </div>
  <div class="reference-button" on:click={e => onRefer(e, canvas)}>
    {#if refered === canvas}
      <img src={referenceSelected} alt="reference"/>
    {:else}
      <img src={reference} alt="reference" />
    {/if}
  </div>
</div>

<style>
  .frame {
    width: 100%;
    height: 100%;
    position: relative;
    border: 2px solid transparent;
    box-sizing: border-box;
    overflow: hidden;
  }
  .selected {
    border-color: blue;
  }
  .delete-button {
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 1;
    cursor: pointer;
    width: 20px;
    height: 20px;
  }
  .reference-button {
    position: absolute;
    bottom: 4px;
    left: 4px;
    z-index: 1;
    cursor: pointer;
    width: 20px;
    height: 20px;
  }
</style>