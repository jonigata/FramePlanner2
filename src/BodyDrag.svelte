<script type="ts">
  import { initializeKeyCache, keyDownFlags } from "./lib/layeredCanvas/keyCache.js";
  import { bodyDragging } from './uiStore';
  import { drawerStore } from '@skeletonlabs/skeleton';
  import { undoStore } from './undoStore';
  import { onMount } from "svelte";

  let dragging = false;
  let dragStart = [0, 0];
  let origin = [0, 0];
  let fullscreen = null;
  let inner = null;
  let x = 0;
  let y = 0;
  let scale = 1.0;

  function handlePointerDown(e) {
    if (keyDownFlags["Space"]) {
      console.log('handlePointerDown', e);
      dragging = true;
      dragStart = [e.clientX, e.clientY];
      origin = [x, y];
      $bodyDragging = true;
    }
  }
  function handlePointerMove(e) {
    if (!dragging) return;
    const [dx, dy] = [e.clientX - dragStart[0], e.clientY - dragStart[1]];
    x = origin[0] + dx;
    y = origin[1] + dy;
  }

  function handlePointerUp(e) {
    dragging = false;
     $bodyDragging = false;
  }

  function handleWheel(e) {
    if ($drawerStore.open) { return; }
    scale -= e.deltaY * 0.0001;
    if (scale < 0.1) scale = 0.1;
    if (scale > 10) scale = 10;
  }

  onMount(() => {
    // move to center of parent
    const parent = inner.parentElement;
    const [parentWidth, parentHeight] = [parent.clientWidth, parent.clientHeight];
    const [innerWidth, innerHeight] = [inner.clientWidth, inner.clientHeight];
    x = (parentWidth - innerWidth) / 2;
    y = (parentHeight - innerHeight) / 2;

    initializeKeyCache(fullscreen, (code) => {
      if (code =="KeyZ" && (keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"]) && (keyDownFlags["ShiftLeft"] || keyDownFlags["ShiftRight"])) {
        console.log("ctrl+shift+z")
        $undoStore.redo();
        return false;
      }
      if (code =="KeyZ" && (keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"])) {
        console.log("ctrl+z")
        $undoStore.undo();
        return false;
      }
      return code === "AltLeft" || code === "AltRight" ||
          code === "ControlLeft" || code === "ControlRight" ||
          code === "ShiftLeft" || code === "ShiftRight" ||
          code === "KeyQ" || code === "KeyW" || code === "KeyS" || 
          code === "KeyF" || code === "KeyR" || code === "KeyD" || code === "KeyB" ||
          code === "KeyT" || code === "KeyY" || 
          code === "Space";
    });
  });

</script>

<div class="fullscreen" 
  on:pointerdown={handlePointerDown}
  on:pointermove={handlePointerMove}
  on:pointerup={handlePointerUp}
  on:pointerleave={handlePointerUp}
  on:wheel={handleWheel}
  bind:this={fullscreen}
>
  <div class="inner" style="transform: translate({x}px, {y}px) scale({scale});" bind:this={inner}>
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
  }
</style>
