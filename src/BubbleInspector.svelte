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
  import { onMount, tick } from 'svelte';
  import { SlideToggle } from '@skeletonlabs/skeleton';
  import HistoryStorage from './HistoryStorage.svelte';

  import bubbleIcon from './assets/title-bubble.png';
  import horizontalIcon from './assets/horizontal.png';
  import verticalIcon from './assets/vertical.png';
  import whitePinIcon from './assets/pin-white.png';
  import pinIcon from './assets/pin.png';
  import embeddedIcon from './assets/embedded.png';
  import unembeddedIcon from './assets/unembedded.png';
  import trash from './assets/trash.png';


  export let position = { x: 0, y: 0 };
  export let bubble = null;
  let oldBubble = null;
  let adjustedPosition = { x: 0, y: 0 };
  let pinned = true;
  let textarea = null;
  let fontList = null;
  let searchOptions = { filterString: '', mincho: true, gothic: true, normal: true, bold: true };
  let shape;

  let drawerPage = 0;
  let localFontName;

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

  $:onChangeBubble(bubble);
  async function onChangeBubble(b) {
    if (b === oldBubble) {return;}
    oldBubble = b;
    if (b) {
      shape = b.shape;
      await tick();
      textarea.focus();
      textarea.select();
      pinned = true;
      move(b.position);
    }
  }

  $:onChangeShape(shape);
  function onChangeShape(s) {
    if (bubble) {
      bubble.shape = s;
      bubble.initOptions();
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

  $:onChangeSearchOptions(searchOptions);
  function onChangeSearchOptions(options) {
    if (fontList) {
      fontList.searchOptions = options;
    }
  }

  function allOff() {
    searchOptions.mincho = false;
    searchOptions.gothic = false;
    searchOptions.normal = false;
    searchOptions.bold = false;
  }

  let historyStorage;
  let localFonts = [];

  onMount(async () => {
    await historyStorage.isReady();
    historyStorage.getAll().onsuccess = (e) => {
      localFonts = e.target.result;
    };
  });

  function setLocalFont() {
    drawerStore.close();
    if (localFontName) {
      console.log(localFontName);
      bubble.fontFamily = localFontName;
      bubble.fontWeight = 400;
      addHistory(localFontName);
    }
  }

  function addHistory(fontFamily) {
    historyStorage.add(fontFamily);
    localFonts.push(fontFamily);
  }

  function removeFromHistory(fontFamily) {
    historyStorage.remove(fontFamily);
    localFonts = localFonts.filter((f) => f !== fontFamily);
  }
</script>

{#if bubble}
<div class="bubble-inspector-container">
  <div class="bubble-inspector variant-glass-surface rounded-container-token vbox gap" use:draggable={{ position: adjustedPosition, onDrag: onDrag ,handle: '.title-bar'}}>
    <div class="title-bar variant-filled-surface rounded-container-token">
      <img class="title-image" src={bubbleIcon} alt="title"/>
      <div class="bubble-size">{Math.round(bubble.size[0])}x{Math.round(bubble.size[1])}</div>
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
      <div class="font-bold slider-label">T</div>
      <RangeSlider name="fontsize" bind:value={bubble.fontSize} max={100} step={1} style="width:130px;"/>
      <div class="text-xs slider-value-text">
        <div class="number-box"><NumberEdit bind:value={bubble.fontSize} showSlider={false}/></div>
      </div>  
      <ColorPicker bind:hex={bubble.fontColor} label="" />
      <span class="mx-2">/</span>縁
      <RangeSlider name="outlinewidth" bind:value={bubble.outlineWidth} max={20} step={1} style="width:50px;"/>
      <ColorPicker bind:hex={bubble.outlineColor} label="" />
    </div>

    <textarea
      class="my-2 rounded-container-token textarea" 
      bind:value={bubble.text}
      bind:this={textarea}/>
    <!-- style="font-family: {fontFamily}; font-weight: {fontWeight}; font-size: {fontSize}px;" -->
    <div class="template-chooser-container">
      <BubbleChooser paperWidth={64} paperHeight={96} bind:selectedShape={shape} />
    </div>

    <div class="hbox px-2 variant-ghost-primary rounded-container-token font-color-picker" style="align-self: stretch;">
      <div class="font-bold slider-label">fill</div>
      <ColorPicker bind:hex={bubble.fillColor} label="" />
      <div class="font-bold slider-label">stroke</div>
      <ColorPicker bind:hex={bubble.strokeColor} label="" />
      <RangeSlider name="line" bind:value={bubble.strokeWidth} max={10} step={1} style="width:100px;"/>
      <div class="embed hbox">
        <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
          <RadioItem bind:group={bubble.embedded} name="embed" value={false}><img class="embed-item" src={unembeddedIcon} alt="embedded" width="12" height="12"/></RadioItem>
          <RadioItem bind:group={bubble.embedded} name="embed" value={true}><img class="embed-item" src={embeddedIcon} alt="unembedded" width="12" height="12"/></RadioItem>
        </RadioGroup>
      </div> 
  </div>
  </div>
</div>
{/if}

<Drawer>
  <div class="drawer-content">
    {#if drawerPage === 0}
    <button class="drawer-page-right px-2 bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 download-button" on:click={() => drawerPage = 1}>ローカル &gt;</button>
    {:else}
    <button class="drawer-page-left px-2 bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 download-button" on:click={() => drawerPage = 0}>&lt; Webフォント</button>
    {/if}
    <h1>フォント</h1>
    {#if drawerPage === 0}
    <div class="hbox gap my-2">
      <SlideToggle name="slider-label" size="sm" bind:checked={searchOptions.mincho}></SlideToggle>明
      <SlideToggle name="slider-label" size="sm" bind:checked={searchOptions.gothic}></SlideToggle>ゴ
      <SlideToggle name="slider-label" size="sm" bind:checked={searchOptions.normal}></SlideToggle>N
      <SlideToggle name="slider-label" size="sm" bind:checked={searchOptions.bold}></SlideToggle>B
      <button class="px-2 bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 download-button" on:click={allOff}>すべてオフ</button>
    </div>
    <hr/>
    <WebFontList on:choose={onChangeFont} bind:this={fontList}/>
    {/if}
    {#if drawerPage === 1}
    <div class="custom-font-panel">
      <input type="text" class="input px-2" bind:value={localFontName} placeholder="フォント名" />
      <button class="px-2 bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 download-button" on:click={setLocalFont}>採用</button>
    </div>
    {/if}
    {#each localFonts as font}
        <div class="font-sample hbox" style="font-family: '{font}'">
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <span on:click={e=>onChangeFont({detail:{fontWeight:"400",fontFamily:font}})}>{font} 今日はいい天気ですね</span>
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <img src={trash} width="20" height="20" alt="trash" on:click={() => removeFromHistory(font)}/>
        </div>
    {/each}
  </div>
</Drawer>

<HistoryStorage bind:this={historyStorage}/>


<style>
  .bubble-inspector-container {
    position: absolute;
    top: 0;
    left: 0;
  }
  .bubble-inspector {
    position: absolute;
    top: 800px;
    left: 50px;
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
  .bubble-size {
    width: 80px;
    height: 24px;
    right: 32px;
    top: 12px;
    font-size: 12px;
    position: absolute;
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
  .embed-item {
    width: 12px;
    height: 12px;
  }
  .embed :global(.radio-item) {
    padding-left: 8px;
    padding-right: 8px;
  }
  .embed {
    margin-left: 8px;
  }
  .font-color-picker :global(.color-picker) {
    width: 20px;
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
  .drawer-content {
    position: relative;
  }
  .drawer-page-right {
    position: absolute;
    right: 16px;
    top: 16px;
  }
  .drawer-page-left {
    position: absolute;
    left: 16px;
    top: 16px;
  }
  .custom-font-panel {
    display: flex;
    flex-direction: column;
    gap: 32px;
    align-items: center;
    padding: 32px;
  }
  .font-sample {
    font-size: 22px;
  }

</style>
