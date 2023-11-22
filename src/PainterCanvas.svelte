<script lang="ts">
  import { onMount } from "svelte";
  import * as paper from 'paper';
  import { convertPointFromPageToNode } from "./lib/layeredCanvas/convertPoint";
  import { generateImageWithScribble } from "./sdwebui";
  import { redrawToken } from './paperStore';
  import KeyValueStorage from "./KeyValueStorage.svelte";

  export let targetImage: HTMLImageElement;
  export let scribbleImage: HTMLImageElement;
  export let tool: { id: number, name: string, strokeStyle: string, lineWidth: number, selected: boolean };
  export let prompt: string;
  export let autoGeneration: boolean;
  export let lcm: boolean;

  let keyValueStorage: KeyValueStorage = null;
  let canvas: HTMLCanvasElement;
  let dragging = false;
  let path: paper.Path;
  let url: string = "http://192.168.68.111:7860";
  let busy = false;
  let queued = false;
  let changeTimer = null;

  export function generate() {
    doScribble(scribbleImage);
  }

  $: onChange([prompt, lcm, autoGeneration]);
  function onChange(_dummy) {
    if (changeTimer) { clearTimeout(changeTimer); }
    changeTimer = setTimeout(() => {
      doScribble(scribbleImage);
    }, 1000);
  }

  function render() {
    const ctx = canvas.getContext('2d');
    ctx.drawImage(scribbleImage, 0, 0);

    if (path) {
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (let key in tool) {
        ctx[key] = tool[key];
      }
      ctx.stroke(new Path2D(path.pathData));
    }
  }

  function onPointerDown(e: PointerEvent) {
    console.log("onPointerDown", e);
    const p = convertPointFromPageToNode(canvas, e.pageX, e.pageY);
    canvas.setPointerCapture(e.pointerId);
    dragging = true;
    path = new paper.Path();
    path.moveTo(p);
    path.closed = false;
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) { return; }
    const p = convertPointFromPageToNode(canvas, e.pageX, e.pageY);
    path.lineTo(p);
    render();
  }

  function onPointerUp(e: PointerEvent) {
    if (!dragging) { return; }

    canvas.releasePointerCapture(e.pointerId);
    dragging = false;

    const offscreen = document.createElement('canvas');
    offscreen.width = scribbleImage.naturalWidth;
    offscreen.height = scribbleImage.naturalHeight;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(scribbleImage, 0, 0);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (let key in tool) {
      ctx[key] = tool[key];
    }
    ctx.stroke(new Path2D(path.pathData));
    scribbleImage.src = offscreen.toDataURL();
    doScribble(scribbleImage);
    path = null;
  }

  async function doScribble(refered) {
    if (!autoGeneration) {
      targetImage.src = scribbleImage.src;
      await targetImage.decode();
      $redrawToken = true;
      return;
    }

    if (busy) { 
      queued = true;
      return; 
    }

    busy = true;
    try {
      const img = await generateImageWithScribble(url, refered, prompt, lcm);
      targetImage.src = img.src;
      await targetImage.decode();
    } catch (e) {
      console.log(e);
      // toastStore.trigger({ message: `画像生成エラー: ${e}`, timeout: 3000});
    }
    busy = false;
    $redrawToken = true;

    if (queued) {
      queued = false;
      doScribble(refered);
    }
  }

  onMount(async () => {
    await keyValueStorage.waitForReady();
    url = await keyValueStorage.get("url") ?? url;
    render();
  });
</script>

<div>
  <canvas
    class="painter-canvas" width="{targetImage.naturalWidth}px" height="{targetImage.naturalHeight}px"
    on:pointermove={onPointerMove} 
    on:pointerdown={onPointerDown} 
    on:pointerup={onPointerUp} 
    bind:this={canvas}/>
</div>

<KeyValueStorage bind:this={keyValueStorage} dbName={"stable-diffusion"} storeName={"default-parameters"}/>

<style>
  .painter-canvas {
    border: 1px solid #000;
  }
</style>