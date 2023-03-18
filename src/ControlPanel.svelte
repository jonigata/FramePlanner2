<script>
  import { draggable } from '@neodrag/svelte';
  import './box.css';
    import TemplateChooser from './TemplateChooser.svelte';

  let width = 840;
  let height = 1188;

  function submit(x) {

  }

</script>

<div class="control-panel" use:draggable={{ handle: '.title-bar' }}>
  <div class="title-bar">Control Panel</div>
  <TemplateChooser />
  <div class="hbox space-around">
      <div class="vbox">
          <div class="labeled-component">
            <label for="canvas-width">Width</label>
          </div>
          <div class="labeled-component">
            <label for="canvas-height">Height</label>
          </div>
      </div>
      <button class="button-primary" id="A4">A4</button>
      <button class="button-primary" id="B5">B5</button>
  </div>

</div>

<style>
  .control-panel {
    top: 50%; /* Y軸の中心に移動 */
    left: 50%; /* X軸の中心に移動 */
    transform: translate(-50%, -50%); /* 自身のサイズに基づいて中心に配置 */

    position: absolute;
    width: 400px;
    height: 800px;
    background-color: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    /* ... other styles */
  }
  .title-bar {
    cursor: move;
    padding: 8px;
  }
  .labeled-component {
    display: flex;
    gap: 4px;
  }
</style>
