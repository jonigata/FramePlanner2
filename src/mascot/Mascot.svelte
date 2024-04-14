<script lang="ts">
  import mascot from '../assets/mascot.png';
  import { draggable } from '@neodrag/svelte';
  import MascotTimeline from './MascotTimeline.svelte';

  let adjustedPosition ;
</script>

<div class="mascot"  use:draggable={{ position: adjustedPosition, handle: '.handle' }}>
  <img class="handle" src={mascot} alt="mascot"/>
  <MascotTimeline />
</div>

<style>
  .mascot {
    position: absolute;
    left: 128px;
    bottom: 8px;
    width: 256px;
    height: 256px;
  }
  img {
    transform: scale(-1, 1);
    filter: drop-shadow(0 0 24px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 16px rgba(0, 224, 224, 0.7));
  }
</style>
