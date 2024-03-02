<script lang="ts">
  export let zoneHeight = 0;
  export let insertPosition = 0;

  export let zone;

/*
  async function onDrop(ev: DragEvent) {
    isDraggingOver = false;
    ev.preventDefault();
    ev.stopPropagation();
    const dt = ev.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      console.log("drop import");
      dispatch("import", files)
    } else {
      console.log("drop move");
      // 内部ドラッグ
      console.log(dt.getData("text/list-item"));
      const sourceIndex = parseInt(dt.getData("text/list-item"));
      dispatch("move", sourceIndex)
    }
  }
*/
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
  class="insert-zone"
  style="--zone-height: {zoneHeight}px; --insert-position: {insertPosition}px;"
  draggable={false}
  bind:this={zone}>
  <div class="insert-line custom-insert-line">
  </div>
</div>

<style>
  .insert-zone {
    position: absolute;
    width: 100%;
    height: var(--zone-height);
    bottom: 50%;
    z-index: 100;
    border: 1px dashed #000;
    pointer-events: none;
  }
  .insert-line {
    /* 外部から変更してほしくないものはこちら */
    position: absolute;
    bottom: var(--insert-position);
    opacity: 1;
    pointer-events: none;
    left: 0;
    right: 0;
    height: 1px;
    background-color: blue;
  }
  .custom-insert-line {
    background-color: blue; /* カラだとエラーになる */
  }
</style>

    