<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import { type ModalSettings, modalStore } from '@skeletonlabs/skeleton';
  import { imageViewerTarget } from '../utils/imageViewerStore';
  import { toolTip } from '../utils/passiveToolTipStore';

  import drop from '../assets/drop.png';
  import reference from '../assets/reference.png';
  import referenceSelected from '../assets/reference-selected.png';
  import telescope from '../assets/telescope.png';

  export let canvas: HTMLCanvasElement;
  export let width = 160;
  export let chosen: HTMLCanvasElement | null = null;
  export let refered: HTMLCanvasElement | null = null;
  export let accessable: boolean = true;

  let container: HTMLDivElement;
  let height: number = 160;
  let image: HTMLImageElement;

  const dispatch = createEventDispatcher();

  $: onCanvasChanged(canvas);
  function onCanvasChanged(c: HTMLCanvasElement) {
    if (c) {
      height = getHeight();
      console.log("onCanvasChanged", c.width, c.height, width, height);
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

  function onView(e: MouseEvent, canvas: HTMLCanvasElement) {
    console.log("onView");
    $imageViewerTarget = canvas;
    e.stopPropagation();
    const d: ModalSettings = {
      type: 'component',
      component: 'imageViewer',
    };
    modalStore.trigger(d);
  }

  // fix aspect ratio
  function getHeight() {
    return (canvas.height / canvas.width) * width;
  }

  onMount(() => {
    console.log("change image size", canvas.width, canvas.height);
    const w = Math.min(width, canvas.width);
    const h = Math.min(height, canvas.height);

    image = new Image();
    canvas.toBlob(async function(blob) {
      const image = new Image();
      if (blob !== null) {
        const url = URL.createObjectURL(blob);
        image.src = url;
        await image.decode();
      }
      image.style.width = `${w}px`;
      image.style.height = `${h}px`;
      image.style.position = 'absolute';
      image.style.top = (width / 2 - w / 2).toString() + 'px';
      image.style.left = (height / 2 - h / 2).toString() + 'px';
      container.appendChild(image);
    }, 'image/png');
  });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="frame" class:selected={chosen === canvas} on:click={onClick} style="width: {width}px; height: {height}px;" draggable="true" on:dragstart={onDragStart}>
  <div class="container w-full h-full" bind:this={container} >
  </div>
  {#if accessable}
    <div class="delete-button" on:click={e => onDelete(e, canvas)} use:toolTip={"削除"}>
      <img src={drop} alt="delete"/>
    </div>
    <div class="telescope-button" on:click={e => onView(e, canvas)} use:toolTip={"見る"}>
      <img src={telescope} alt="view" />
    </div>
    <div class="reference-button" on:click={e => onRefer(e, canvas)} use:toolTip={"i2i参照"}>
      {#if refered === canvas}
        <img src={referenceSelected} alt="reference"/>
      {:else}
        <img src={reference} alt="reference" />
      {/if}
    </div>
  {/if}
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
    cursor: pointer;
    width: 20px;
    height: 20px;
    filter: drop-shadow(0 0 2px black);
  }
  .reference-button {
    position: absolute;
    bottom: 4px;
    left: 4px;
    cursor: pointer;
    width: 20px;
    height: 20px;
    filter: drop-shadow(0 0 2px black);
  }
  .telescope-button {
    position: absolute;
    top: 4px;
    left: 4px;
    z-index: 1;
    cursor: pointer;
    width: 20px;
    height: 20px;
    filter: drop-shadow(0 0 2px black);
  }
</style>