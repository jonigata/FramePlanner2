<script type="ts">
  import { draggable } from '@neodrag/svelte';
  import NumberEdit from './NumberEdit.svelte';
  import { Drawer, drawerStore } from '@skeletonlabs/skeleton';
  import type { DrawerSettings } from '@skeletonlabs/skeleton';
  import './box.css';
  import WebFontList from './WebFontList.svelte';
  import BubbleChooser from './BubbleChooser.svelte';

  import { onMount, afterUpdate } from 'svelte';

  onMount(() => {
    console.log('Component mounted, position:', position);
  });

  afterUpdate(() => {
    console.log('Component updated, position:', position);
  });

  export let isOpen = false;

  let fontsize = 22;
  let fontStyle = "font-family: 'Shippori Mincho', serif; font-weight: regular; font-style: normal";
  let fontFamily = "'Shippori Mincho', serif";
  export let position = { x: 0, y: 0 };
  let adjustedPosition = { x: 0, y: 0 };
  let dialog = null;

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

  $:move(position)
  function move(p) {
    console.log(p);
    adjustedPosition = { x: p.x - 175, y: p.y + 40 };
  }
</script>

{#if isOpen}
<div class="bubble-inspector-container">
  <div class="bubble-inspector variant-soft-surface rounded-container-token vbox" use:draggable={{ position: adjustedPosition, handle: '.title-bar'}} bind:this={dialog}>
    <div class="title-bar">Bubble Detail</div>
    <div class="hbox gap-x-2">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="hbox expand selected-font variant-soft-primary rounded-container-token" on:click={chooseFont}>{fontFamily}</div>
      <div class="hbox px-2 variant-soft-primary rounded-container-token">fontsize <div class="number-box"><NumberEdit bind:value={fontsize} showSlider="{true}"/></div></div>
    </div>
    <textarea class="mx-2 my-2 rounded-container-token" style="{fontStyle}; font-size: {fontsize}px;">

    </textarea>
    <div class="px-2 template-chooser-container">
      <BubbleChooser paperWidth={"96px"} paperHeight={"96px"} />
    </div>
  </div>
</div>
{/if}

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
  .bubble-inspector-container {
      position: absolute;
      top: 0;
      left: 0;
  }
  .bubble-inspector {
    position: absolute;
    width: 350px;
    height: 320px;
    display: flex;
    flex-direction: column;
    padding: 8px;
  }
  textarea {
    flex: 1;
    align-self: stretch;
    resize: none;
    border: none;
    outline: none;
    padding: 0.5rem;
    box-sizing: border-box;
  }
  .number-box {
    width: 35px;
    height: 20px;
    display: inline-block;
  }
  .selected-font:hover {
    color: rgb(128, 93, 47);
  }
  .template-chooser-container {
    height: 120px;
    width: 100%;
  }
</style>
