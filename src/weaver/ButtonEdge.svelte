<script lang="ts">
  import { getBezierPath, BaseEdge, type EdgeProps, EdgeLabelRenderer } from '@xyflow/svelte';
  import { getContext } from 'svelte';

  const disconnect: (id: string, sourceHandleId: string, targetHandleId: string)=>void = getContext('disconnect');

  type $$Props = EdgeProps;

  export let id: $$Props['id'];
  export let sourceX: $$Props['sourceX'];
  export let sourceY: $$Props['sourceY'];
  export let sourcePosition: $$Props['sourcePosition'];
  export let targetX: $$Props['targetX'];
  export let targetY: $$Props['targetY'];
  export let targetPosition: $$Props['targetPosition'];
  export let markerEnd: $$Props['markerEnd'] = undefined;
  export let style: $$Props['style'] = undefined;
  export let sourceHandleId: $$Props['sourceHandleId'] = null;
  export let targetHandleId: $$Props['targetHandleId'] = null;
  let _dummy = $$restProps; // warningがうるさいので

  $: [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  console.log("ButtonEdge");

  function onDisconnection(e: MouseEvent) {
    e.stopPropagation();
    console.log("onDisconnection", id, sourceHandleId, targetHandleId)
    disconnect(id, sourceHandleId, targetHandleId);
  }
</script>

<BaseEdge path={edgePath} {markerEnd} {style} />
<EdgeLabelRenderer>
  <div
    class="edgeButtonContainer nodrag nopan"
    style:transform="translate(-50%, -50%) translate({labelX}px,{labelY}px)"
  >
    <button
      class="edgeButton"
      on:click={onDisconnection}
    >
      ×
    </button>
  </div>
</EdgeLabelRenderer>

<style>
  .edgeButtonContainer {
    position: absolute;
    font-size: 12pt;
    /* everything inside EdgeLabelRenderer has no pointer events by default */
    /* if you have an interactive element, set pointer-events: all */
    pointer-events: all;
  }

  .edgeButton {
    width: 20px;
    height: 20px;
    background: #eee;
    border: 1px solid #fff;
    cursor: pointer;
    border-radius: 50%;
    font-size: 12px;
    line-height: 1;
  }

  .edgeButton:hover {
    box-shadow: 0 0 6px 2px rgba(0, 0, 0, 0.08);
  }
</style>
