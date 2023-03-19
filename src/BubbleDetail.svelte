<script type="ts">
  import { draggable } from '@neodrag/svelte';
  import NumberEdit from './NumberEdit.svelte';
  import { Drawer, drawerStore } from '@skeletonlabs/skeleton';
  import type { DrawerSettings } from '@skeletonlabs/skeleton';
  import './box.css';
    import WebFontList from './WebFontList.svelte';

  let fontsize = 22;
  let fontStyle = "font-family: 'Shippori Mincho', serif; font-weight: regular; font-style: normal";
  let fontFamily = "'Shippori Mincho', serif";

  function chooseFont() {
    const settings: DrawerSettings = {
      position: 'right',
      width: 'w-[720px]'
    };
    drawerStore.open(settings);
  }

  function getFontFamily() {
    const fontFamily = fontStyle.split(':')[1].split(',')[0].trim();
    return fontFamily;
  }

  function onChoose(event) {
    drawerStore.close();
    console.log(event.detail);
    fontStyle = event.detail.fontStyle;
    fontFamily = getFontFamily();
  }
</script>

<div class="bubble-detail variant-soft-surface rounded-container-token" use:draggable={{ handle: '.title-bar' }}>
  <div class="title-bar">Bubble Detail</div>
  <div class="hbox gap-x-2">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="hbox expand selected-font variant-soft-primary rounded-container-token" on:click={chooseFont}>{fontFamily}</div>
    <div class="hbox px-2 variant-soft-primary rounded-container-token">fontsize <div class="number-box"><NumberEdit bind:value={fontsize} showSlider="{true}"/></div></div>
  </div>
  <textarea class="m-2 rounded-container-token" style="{fontStyle}; font-size: {fontsize}px;">

  </textarea>
</div>

<Drawer>
  <div class="drawer-content">
    <h1>Font</h1>
    <p>Choose a font.</p>
    <WebFontList on:choose={onChoose}/>
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
  .selected-font:hover {
    color: rgb(128, 93, 47);
  }
</style>
