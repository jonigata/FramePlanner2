<script type="ts">
  import { keyDownFlags } from "./lib/layeredCanvas/keyCache.js";
  import { bodyDragging } from './uiStore';

  let dragging = false;
  let dragStart = [0, 0];
  let origin = [0, 0];
  let inner = null;
  let x = 0;
  let y = 0;

  function handlePointerDown(e) {
    console.log('pointerdown');
    if (keyDownFlags["Space"]) {
      dragging = true;
      dragStart = [e.clientX, e.clientY];
      origin = [x, y];
      $bodyDragging = true;
    }
  }
  function handlePointerMove(e) {
    if (!dragging) return;
    console.log('dragging');
    const [dx, dy] = [e.clientX - dragStart[0], e.clientY - dragStart[1]];
    x = origin[0] + dx;
    y = origin[1] + dy;
  }

  function handlePointerUp(e) {
    console.log('pointerup');
    dragging = false;
    $bodyDragging = false;
  }

</script>

<div class="fullscreen" 
  on:pointerdown={handlePointerDown}
  on:pointermove={handlePointerMove}
  on:pointerup={handlePointerUp}
  on:pointerleave={handlePointerUp}
>
  <div class="inner" style="transform: translate({x}px, {y}px);" bind:this={inner}>
    <slot/>
  </div>
</div>

<style>
  .fullscreen {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  .inner {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
</style>
