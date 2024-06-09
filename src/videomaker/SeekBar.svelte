<script lang="ts">
  import type { DisplayProgramEntry } from './renderBook';

  export let moveDuration: number;
  export let standardWait: number;
  export let program: DisplayProgramEntry[];
  export let cursor: number;

  let containerWidth: number;
  let containerHeight: number;

  let canvas: HTMLCanvasElement;
  let length = 0;

  let pointerDown = false;
  function onPointerDown(e) {
    e.preventDefault();
    pointerDown = true;
    onPointerMove(e);
    canvas.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    e.preventDefault();
    if (pointerDown) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      cursor = x / containerWidth * length;
      if (cursor < 0) {
        cursor = 0;
      }
      if (cursor > length) {
        cursor = length;
      }
    }
  }

  function onPointerUp(e) {
    e.preventDefault();
    pointerDown = false;
    canvas.releasePointerCapture(e.pointerId);
  }

  function draw() {
    length = 0;
    for (const e of program) {
      length += standardWait + e.residenceTime;
      length += moveDuration;
    }

    const xFactor = containerWidth / length;

    const ctx = canvas.getContext('2d');
    let x = 0;
    for (const e of program) {
      const duration = standardWait + e.residenceTime;
      ctx.fillStyle = "#00E890";
      ctx.fillRect(x, 0, duration * xFactor, containerHeight);
      x += duration * xFactor;
      ctx.fillStyle = "#006AAA";
      ctx.fillRect(x, 0, moveDuration * xFactor, containerHeight);
      x += moveDuration * xFactor;
    }

    // cursor
    let cursorPosition = cursor * xFactor;
    ctx.fillStyle = "#A522FF";
    ctx.fillRect(cursorPosition, 0, 4, containerHeight);
  }

  $: if (canvas != null && program != null && cursor != null && moveDuration != null && standardWait != null &&
         containerHeight != null && containerWidth != null) {
    draw();
  }

</script>

<div class="seekbar-panel" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
  <canvas 
    width={containerWidth} 
    height={containerHeight}
    bind:this={canvas}
    style="width: {containerWidth}px; height: {containerHeight}px;"
    on:pointerdown={onPointerDown}
    on:pointermove={onPointerMove}
    on:pointerup={onPointerUp}/>
</div>

<style>
  .seekbar-panel {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
</style>