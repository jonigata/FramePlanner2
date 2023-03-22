<script type="ts">
  import { draggable } from '@neodrag/svelte';
  import NumberEdit from './NumberEdit.svelte';
  import { Drawer, drawerStore } from '@skeletonlabs/skeleton';
  import type { DrawerSettings } from '@skeletonlabs/skeleton';
  import './box.css';
  import WebFontList from './WebFontList.svelte';
  import BubbleChooser from './BubbleChooser.svelte';

  export let isOpen = false;

  let fontSize = 22;
  let fontStyle = "normal";
  let fontWeight = "400";
  let fontFamily = "'Shippori Mincho', serif";
  let bubbleText = "";
  export let position = { x: 0, y: 0 };
  export let bubble = null;
  let adjustedPosition = { x: 0, y: 0 };
  let bubbleShape;

  $:inputValue(bubble);
  function inputValue(b) {
    if (b) {
      fontSize = b.fontSize;
      fontStyle = b.fontStyle;
      fontWeight = b.fontWeight === "regular" ? "normal" : b.fontWeight;
      fontFamily = b.fontFamily;
      bubbleText = b.text;
      bubbleShape = b.shape;
    }
  }

  $:outputValue(fontSize, fontWeight, fontFamily, bubbleText, bubbleShape);
  function outputValue(fs, fw, ff, bt, bs) {
    if (bubble) {
      bubble.fontSize = fs;
      bubble.fontStyle = fontStyle;
      bubble.fontWeight = fw;
      bubble.fontFamily = ff;
      bubble.text = bt;
      bubble.shape = bs;
    }
  }

  function chooseFont() {
    const settings: DrawerSettings = {
      position: 'right',
      width: 'w-[720px]',
      id: 'font'
    };
    drawerStore.open(settings);
  }

  function onChangeFont(event) {
    drawerStore.close();
    fontWeight = event.detail.fontWeight;
    fontFamily = event.detail.fontFamily;
  }

  $:move(position);
  function move(p) {
    console.log(p);
    adjustedPosition = { x: p.x - 175, y: p.y + 40 };
  }

</script>

{#if isOpen}
<div class="bubble-inspector-container">
  <div class="bubble-inspector variant-glass-surface rounded-container-token vbox" use:draggable={{ position: adjustedPosition, handle: '.title-bar'}}>
    <div class="title-bar variant-filled-surface rounded-container-token"><img class="title-image" id="load-frame-template" src="/src/assets/title-bubble.png" alt="title"/></div>
      <div class="hbox gap-x-2" style="align-self: stretch;">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="hbox expand selected-font variant-ghost-primary rounded-container-token" on:click={chooseFont}>{fontFamily}</div>
      <!-- svelte-ignore a11y-label-has-associated-control -->
      <label class="hbox px-2 variant-ghost-primary rounded-container-token">fontSize <div class="number-box"><NumberEdit bind:value={fontSize} showSlider="{true}"/></div></label>
    </div>
    <textarea
      class="mx-2 my-2 rounded-container-token" 
      bind:value={bubbleText}/>
    <!-- style="font-family: {fontFamily}; font-weight: {fontWeight}; font-size: {fontSize}px;" -->
    <div class="px-2 template-chooser-container">
      <BubbleChooser paperWidth={64} paperHeight={96} bind:selectedShape={bubbleShape} />
    </div>
  </div>
</div>
{/if}

<Drawer>
  <div class="drawer-content">
    <h1>Font</h1>
    <p>Choose a font.</p>
    <WebFontList on:choose={onChangeFont}/>
  </div>
</Drawer>


<style>
  .bubble-inspector-container {
      position: absolute;
      top: 0;
      left: 0;
  }
  .bubble-inspector {
    position: absolute;
    width: 350px;
    height: 340px;
    display: flex;
    flex-direction: column;
    padding: 8px;
    gap: 2px;
  }
  .title-bar {
    cursor: move;
    align-self: stretch;
    margin-bottom: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .title-image {
    width: 32px;
    height: 32px;
  }
  textarea {
    flex: 1;
    align-self: stretch;
    resize: none;
    border: none;
    outline: none;
    padding: 0.5rem;
    box-sizing: border-box;
    line-height: 1.1;
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
