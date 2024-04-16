<script lang="ts">
  import mascot from '../assets/mascot.png';
  import { draggable } from '@neodrag/svelte';
  import MascotTimeline from './MascotTimeline.svelte';
  import { mascotWindowRect } from './mascotStore';
  import { observeResize } from '../utils/observeResize';

  let adjustedPosition ;
</script>

<div class="container" use:draggable={{ position: adjustedPosition, handle: '.handle' }}>
  <div class="resizable" use:observeResize>
    <MascotTimeline />
  </div>
  <div class="handle absolute-positioned">
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
