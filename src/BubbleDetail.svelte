<script type="ts">
  import { draggable } from '@neodrag/svelte';
  import NumberEdit from './NumberEdit.svelte';
  import { Drawer, drawerStore } from '@skeletonlabs/skeleton';
  import type { DrawerSettings } from '@skeletonlabs/skeleton';
  import './box.css';

  let fontsize = 22;

  function chooseFont() {
    const settings: DrawerSettings = {
      position: 'right',
      width: 'w-[640px]'
    };
    drawerStore.open(settings);
  }
</script>

<div class="bubble-detail variant-soft-surface rounded-container-token" use:draggable={{ handle: '.title-bar' }}>
  <div class="title-bar">Bubble Detail</div>
  <div class="hbox">
    <button class="btn btn-sm variant-filled" on:click={chooseFont}>Font</button>
    fontsize <div class="number-box"><NumberEdit bind:value={fontsize} showSlider="{true}"/></div>
  </div>
  <textarea class="rounded-container-token" style="font-size: {fontsize}px;">

  </textarea>
</div>

<Drawer>
  <div class="drawer-content">
    <h1>Font</h1>
    <p>Choose a font.</p>
  </div>
</Drawer>

<style>
  .title-bar {
    cursor: move;
    padding: 8px;
  }
  .bubble-detail {
    transform: translate(-50%, -50%); /* 自身のサイズに基づいて中心に配置 */

    position: absolute;
    width: 350px;
    height: 250px;
    display: flex;
    flex-direction: column;
    padding: 8px;
  }
  textarea {
    flex: 1;
    resize: none;
    border: none;
    outline: none;
    padding: 0.5rem;
  }
  .number-box {
    width: 35px;
    height: 20px;
    display: inline-block;
  }
</style>
