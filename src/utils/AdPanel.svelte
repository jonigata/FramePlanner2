<script>
  import { onMount, afterUpdate } from "svelte";

  export let isOpen = false;
  let panelWidth;
  let contentRef;

  function updateWidth() {
    if (contentRef) {
      panelWidth = contentRef.offsetWidth;
    }
  }

  onMount(updateWidth);
  afterUpdate(updateWidth);
</script>

<div class="overflow-hidden" class:pointer-events-none={!isOpen}>
  <div
    class="transform transition-transform duration-300 ease-in-out"
    class:translate-x-full={!isOpen}
    style="width: {panelWidth}px"
  >
    <div
      bind:this={contentRef}
      class="variant-glass-surface p-4 shadow-md max-h-[calc(100vh-4rem)] overflow-y-auto rounded-l-lg inline-block"
    >
      <slot />
    </div>
  </div>
</div>
