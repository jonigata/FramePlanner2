<script lang="ts">
  import mascot from '../assets/mascot.png';
  import { draggable } from '@neodrag/svelte';
  import MascotTimeline from './MascotTimeline.svelte';
  import { mascotVisible, mascotWindowRect } from './mascotStore';
  import { resize } from '../utils/observeResize';
  import { fitWithin } from '../utils/observeWithin';

  function onClick(e: MouseEvent) {
    e.preventDefault();
    $mascotVisible = false;
  }

</script>

<div class="container" use:draggable={
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
  <div class="handle absolute-positioned" on:contextmenu={onClick}>
    <img class="mascot handle" src={mascot} alt="mascot"/>
  </div>
</div>

<style>
  .container {
    position: relative;
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
  }
  .mascot {
    position: absolute;
    right: 0px;
    bottom: 0px;
    width: 256px;
    height: 256px;
    max-width: 256px;
  }
  img {
    transform: scale(-1, 1);
    filter: drop-shadow(0 0 24px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 16px rgba(0, 224, 224, 0.7));
  }
</style>
