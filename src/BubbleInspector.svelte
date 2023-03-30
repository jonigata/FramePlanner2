<script type="ts">
  import { draggable } from '@neodrag/svelte';
  import NumberEdit from './NumberEdit.svelte';
  import { Drawer, drawerStore } from '@skeletonlabs/skeleton';
  import type { DrawerSettings } from '@skeletonlabs/skeleton';
  import './box.css';
  import WebFontList from './WebFontList.svelte';
  import BubbleChooser from './BubbleChooser.svelte';
  import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
  import { RangeSlider } from '@skeletonlabs/skeleton';
	import ColorPicker from 'svelte-awesome-color-picker';

  import bubbleIcon from './assets/title-bubble.png';
  import horizontalIcon from './assets/horizontal.png';
  import verticalIcon from './assets/vertical.png';
  import whitePinIcon from './assets/pin-white.png';
  import pinIcon from './assets/pin.png';

  export let position = { x: 0, y: 0 };
  export let bubble = null;
  let adjustedPosition = { x: 0, y: 0 };
  let pinned = false;

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
    bubble.fontWeight = event.detail.fontWeight;
    bubble.fontFamily = event.detail.fontFamily;
  }

  $:move(position);
  function move(p) {
    if (!p) {return;}
    if (pinned) {return;}

    const center = p.center;
    const height = p.height;
    const offset = p.offset;
    const dialogWidth = 350;
    const dialogHeight = 400;
    adjustedPosition = { 
      x: Math.floor(center.x - dialogWidth*0.5), 
      y: Math.floor(center.y + (offset === 1 ? -height*0.5 - 40 - dialogHeight : height*0.5 + 40))
    };
  }

  $:onChangeShape(bubble?.shape);
  function onChangeShape(shape) {
    if (bubble) {
      bubble.options = {};
    }
  }

  function resetPin() {
    pinned = false;
  }

  function setPin() {
    pinned = true;
  }

  function onDrag({offsetX, offsetY}) {
    adjustedPosition = {x: offsetX, y: offsetY};
  }

</script>

{#if bubble}
<div class="bubble-inspector-container">
  <div class="bubble-inspector variant-glass-surface rounded-container-token vbox gap" use:draggable={{ position: adjustedPosition, onDrag: onDrag ,handle: '.title-bar'}}>
    <div class="title-bar variant-filled-surface rounded-container-token">
      <img class="title-image" src={bubbleIcon} alt="title"/>
      {#if pinned}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <img class="pin-image" src={whitePinIcon} alt="pin" on:click={resetPin}/>
      {:else}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <img class="pin-image" src={pinIcon} alt="pin" on:click={setPin}/>
      {/if}
    </div>

    <div class="hbox gap-x-2 expand">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="hbox expand selected-font variant-ghost-primary rounded-container-token grow" on:click={chooseFont}>{bubble.fontFamily}</div>
      <div class="direction hbox">
        <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
          <RadioItem bind:group={bubble.direction} name="justify" value={'v'}><img class="direction-item" src={verticalIcon} alt="title" width="12" height="12"/></RadioItem>
          <RadioItem bind:group={bubble.direction} name="justify" value={'h'}><img class="direction-item" src={horizontalIcon} alt="title" width="12" height="12"/></RadioItem>
        </RadioGroup>
      </div>
    </div>

    <div class="hbox px-2 variant-ghost-primary rounded-container-token font-color-picker" style="align-self: stretch;">
      <div class="font-bold slider-label">fontsize</div>
      <RangeSlider name="fontsize" bind:value={bubble.fontSize} max={100} step={1} style="width:200px;"/>
      <div class="text-xs slider-value-text">
        <div class="number-box"><NumberEdit bind:value={bubble.fontSize} showSlider={false}/></div>
      </div>
      <ColorPicker bind:hex={bubble.fontColor} label="" />
    </div>

    <textarea
      class="my-2 rounded-container-token textarea" 
      bind:value={bubble.text}/>
    <!-- style="font-family: {fontFamily}; font-weight: {fontWeight}; font-size: {fontSize}px;" -->
    <div class="template-chooser-container">
      <BubbleChooser paperWidth={64} paperHeight={96} bind:selectedShape={bubble.shape} />
    </div>

    <div class="hbox px-2 variant-ghost-primary rounded-container-token font-color-picker" style="align-self: stretch;">
      <div class="font-bold slider-label">fill</div>
      <ColorPicker bind:hex={bubble.fillColor} label="" />
      <div class="font-bold slider-label">stroke</div>
      <ColorPicker bind:hex={bubble.strokeColor} label="" />
      <RangeSlider name="line" bind:value={bubble.strokeWidth} max={10} step={1} style="width:100px;"/>
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
    height: 400px;
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
    position: relative;
  }
  .title-image {
    width: 32px;
    height: 32px;
  }
  .pin-image {
    width: 24px;
    height: 24px;
    right: 4px;
    top: 4px;
    position: absolute;
    cursor: pointer;
  }
  .textarea {
    flex: 1;
    align-self: stretch;
    resize: none;
    outline: none;
    padding: 0.5rem;
    box-sizing: border-box;
    line-height: 1.1;
    resize: none;
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
  .direction-item {
    width: 12px;
    height: 12px;
  }
  .direction :global(.radio-item) {
    padding-left: 8px;
    padding-right: 8px;
  }
  .font-color-picker :global(.container .color) {
    width: 15px;
    height: 15px;
    border-radius: 4px;
  }
  .font-color-picker :global(.container .alpha) {
    width: 15px;
    height: 15px;
    border-radius: 4px;
  }
</style>
