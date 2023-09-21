<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher();

  export let acceptable: boolean;
  export let depth: number;

  let isDraggingOver = false;

  async function onDragOver(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    isDraggingOver = true;
  }

  function onDragLeave() {
    isDraggingOver = false;
  }

  function onDrop(ev: DragEvent) {
    isDraggingOver = false;
    dispatch('drop', ev.dataTransfer);
    ev.preventDefault();
    ev.stopPropagation();
  }
  
</script>

<div 
  class="drop-zone"
  class:acceptable={acceptable}
  on:dragover={onDragOver}
  on:dragleave={onDragLeave}
  on:drop={onDrop}
  style="z-index: {depth}"
>
  <div
    class="insert-line"
    class:dragging={isDraggingOver}
  >
  </div>
</div>


<style>
  .drop-zone {
/*
    background-color: #00e8;
    border: 1px dashed #ccc;
*/
    position: absolute;
    top: -50%; /* 親の高さの半分だけ上に移動 */
    left: 0;
    right: 0;
    width: 100%;
    height: 105%; /* 隙間ができてちらつかないように */
    z-index: 1;
    display: none;
  }

  .drop-zone.acceptable {
    display: block;
  }

  .insert-line {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background-color: black;
    transform: translateY(-50%);  /* 縦中央に配置 */
    opacity: 0;
    pointer-events: none;
  }

  .dragging {
    opacity: 1;
  }
</style>

    