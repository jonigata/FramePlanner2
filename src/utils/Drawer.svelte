<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from "svelte";

  export let open = false;
  export let duration = 0.2;
  export let placement = "left";
  export let size: string | null = null;
  export let overlay = true;
  export let hideOverlayOnDrag = false;

  const dispatch = createEventDispatcher();
  let isDragging = false;

  $: style = `--duration: ${duration}s; --size: ${size};`;
  $: shouldShowOverlay = overlay && (!hideOverlayOnDrag || !isDragging);

  function handleClickAway() {
    dispatch("clickAway");
  }

  function handleDragStart() {
    console.log("Drag started");
    if (hideOverlayOnDrag) {
      isDragging = true;
    }
  }

  function handleDragEnd() {
    console.log("Drag ended");
    if (hideOverlayOnDrag) {
      isDragging = false;
    }
  }

  function handleDrop() {
    console.log("Dropped");
    if (hideOverlayOnDrag) {
      isDragging = false;
    }
  }

  onMount(() => {
    if (hideOverlayOnDrag) {
      window.addEventListener("dragstart", handleDragStart);
      window.addEventListener("dragend", handleDragEnd);
      window.addEventListener("drop", handleDrop);
    }
  });

  onDestroy(() => {
    if (hideOverlayOnDrag) {
      window.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("dragend", handleDragEnd);
      window.removeEventListener("drop", handleDrop);
    }
  });
</script>

<aside class="drawer" class:open {style}>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  {#if shouldShowOverlay}
    <div class="overlay" on:click={handleClickAway} />
  {/if}
  <div class="panel {placement}" class:size>
    {#if open}
      <slot />
    {/if}
  </div>
</aside>

<style>
  .drawer {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    z-index: -1;
    transition: z-index var(--duration) step-end;
    pointer-events: none;
  }

  .drawer.open {
    z-index: 99;
    transition: z-index var(--duration) step-start;
  }

  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(100, 100, 100, 0.5);
    opacity: 0;
    z-index: 2;
    transition: opacity var(--duration) ease;
    pointer-events: auto;
  }

  .drawer.open .overlay {
    opacity: 1;
  }

  .panel {
    position: fixed;
    width: 100%;
    height: 100%;
    background: white;
    z-index: 3;
    transition: transform var(--duration) ease;
    overflow: auto;
    pointer-events: auto;
  }

  .panel.left {
    left: 0;
    transform: translate(-100%, 0);
  }

  .panel.right {
    right: 0;
    transform: translate(100%, 0);
  }

  .panel.top {
    top: 0;
    transform: translate(0, -100%);
  }

  .panel.bottom {
    bottom: 0;
    transform: translate(0, 100%);
  }

  .panel.left.size,
  .panel.right.size {
    max-width: var(--size);
  }

  .panel.top.size,
  .panel.bottom.size {
    max-height: var(--size);
  }

  .drawer.open .panel {
    transform: translate(0, 0);
  }
</style>
