<script>
  import { createEventDispatcher } from "svelte";

  export let open = false;
  export let duration = 0.2;
  export let placement = "left";
  export let size = null;
  export let overlay = true;

  const dispatch = createEventDispatcher();

  $: style = `--duration: ${duration}s; --size: ${size};`;

  function handleClickAway() {
    dispatch("clickAway");
  }
</script>

<aside class="drawer" class:open {style}>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  {#if overlay}
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
