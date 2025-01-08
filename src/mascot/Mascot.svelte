<script lang="ts">
  import { draggable } from '@neodrag/svelte';
  import MascotTimeline from './MascotTimeline.svelte';
  import { mascotVisible, mascotWindowRect } from './mascotStore';
  import { resize } from '../utils/observeResize';
  import { fitWithin } from '../utils/observeWithin';
  import MascotStatus from './MascotStatus.svelte';

  function onClick(e: MouseEvent) {
    e.preventDefault();
    $mascotVisible = false;
  }

</script>

<div class="mascot-container" use:draggable={
  {
    handle: '.handle',
    defaultPosition: $mascotWindowRect,
    transform: ({ offsetX, offsetY }) => {
      $mascotWindowRect = new DOMRect(offsetX, offsetY, $mascotWindowRect.width, $mascotWindowRect.height);
      return `translate(${offsetX}px, ${offsetY}px)`;
    }
  }}>
  <div class="resizable"use:resize={mascotWindowRect} use:fitWithin>
    <MascotTimeline />
  </div>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="absolute-positioned" on:contextmenu={onClick}>
    <!-- <img class="mascot handle" draggable={false} src={mascot} alt="mascot"/> -->
    <MascotStatus/>
  </div>
</div>

<style>
  .mascot-container {
    position: absolute;
    bottom: 0;
    right: 0;
  }
  .resizable {
    width: 500px;
    height: 700px;
    overflow: auto;
    resize: both;
  }
  .absolute-positioned {
    position: absolute;
    bottom: 0;
    left: 0px;
    overflow: visible;
    width: 0px;
    height: 0px;
  }
</style>
