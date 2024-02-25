<script lang="ts">
  import writableDerived from "svelte-writable-derived";
  import { draggable } from '@neodrag/svelte';
  import { type FrameInspectorPosition, frameInspectorTarget, frameInspectorPosition } from './frameInspectorStore';

  let adjustedPosition = { x: window.innerWidth - 350 - 16, y: 16 };
  let innerWidth = window.innerWidth;
  let innerHeight = window.innerHeight;
  let inspector = null;

  const frame = writableDerived(
    frameInspectorTarget,
    (fit) => fit?.frame,
    (f, fit) => {
      fit.frame = f;
      return fit;
    }
  );
  const framePage = writableDerived(
    frameInspectorTarget,
    (fit) => fit?.page,
    (f, fit) => {
      fit.page = f;
      return fit;
    }
  );

  function onDrag({offsetX, offsetY}) {
    adjustedPosition = {x: offsetX, y: offsetY};
  }

</script>

<svelte:window bind:innerWidth bind:innerHeight/>

{#if $frame}
<div class="frame-inspector-container">
  <div class="frame-inspector variant-glass-surface rounded-container-token vbox gap" use:draggable={{ position: adjustedPosition, onDrag: onDrag ,handle: '.title-bar'}} bind:this={inspector}>    
    <div class="title-bar variant-filled-surface rounded-container-token">
      コマ
    </div>
  </div>
</div>
{/if}

<style>
  .frame-inspector-container {
    position: absolute;
    top: 0;
    left: 0;
  }
  .frame-inspector {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 350px;
    display: flex;
    flex-direction: column;
    padding: 8px;
    gap: 2px;
  }
  .title-bar {
    cursor: move;
    align-self: stretch;
    margin-bottom: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }
</style>
