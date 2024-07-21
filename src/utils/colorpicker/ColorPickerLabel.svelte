<script lang="ts">
  import { colorPickerStore } from './colorPickerStore';

  export let hex: string;

  function onUpdate(color: string) {
    hex = color;
  }

  function onClick(e: MouseEvent) {
    const position = {x: e.clientX, y: e.clientY};
    $colorPickerStore = {color: hex, onUpdate, position};
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="color-label" 
  on:click={onClick}
  >
  <div class="background">
    <div class="foreground" style="background-color: {hex};">
    </div>
  </div>
</div>

<style>

  .color-label {
    display: inline-block;
    width: 100%;
    height: 100%;
  }
  .background {
    position: relative;
    width: 100%;
    height: 100%;
    background-image: linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc),
                      linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
    background-color: white;
    border-radius: 4px;
  }  
  .foreground {
    width: 100%;
    height: 100%;
    border-radius: 4px;
  }
</style>