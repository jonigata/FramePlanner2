<script>
  export let width = '140px';
  export let height = '198px';
</script>

<canvas />

<style>
  canvas {
    width: var(--canvas-width, 140px);
    height: var(--canvas-height, 198px);
    background-color: black;
  }

  :host {
    --canvas-width: {width}
    --canvas-height: {height}
  }
</style>
