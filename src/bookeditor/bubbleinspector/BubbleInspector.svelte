<script lang="ts">
  import writableDerived from "svelte-writable-derived";
  import { draggable } from '@neodrag/svelte';
  import NumberEdit from '../../utils/NumberEdit.svelte';
  import '../../box.css';
  import BubbleSample from './BubbleSample.svelte';
  import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import ExponentialRangeSlider from '../../utils/ExponentialRangeSlider.svelte';
	import ColorPicker from 'svelte-awesome-color-picker';
  import { tick } from 'svelte';
  import { toolTip } from '../../utils/passiveToolTipStore';
  import { fontChooserOpen, chosenFont } from './fontStore';
  import { shapeChooserOpen, chosenShape } from './shapeStore';
  import BubbleInspectorAppendix from './BubbleInspectorAppendix.svelte';
  import type { Bubble } from "../../lib/layeredCanvas/dataModels/bubble";
  import type { Film } from "../../lib/layeredCanvas/dataModels/film";
  import { type BubbleInspectorPosition, bubbleInspectorTarget, bubbleInspectorPosition, bubbleSplitCursor } from './bubbleInspectorStore';
  import { newBubbleToken } from '../../filemanager/fileManagerStore';
  import FilmList from "../frameinspector/FilmList.svelte";
  import ImageProvider from '../../generator/ImageProvider.svelte';

  import bubbleIcon from '../../assets/title-bubble.png';
  import horizontalIcon from '../../assets/horizontal.png';
  import verticalIcon from '../../assets/vertical.png';
  import whitePinIcon from '../../assets/pin-white.png';
  import pinIcon from '../../assets/pin.png';
  import embeddedIcon from '../../assets/embedded.png';
  import unembeddedIcon from '../../assets/unembedded.png';
  import resetIcon from '../../assets/reset.png';
  import movieIcon from '../../assets/movie.png';

  let innerWidth = window.innerWidth;
  let innerHeight = window.innerHeight;
  let oldBubble = null;
  let adjustedPosition = { x: window.innerWidth - 350 - 16, y: 16 };
  let pinned = true;
  let textarea = null;
  let inspectorSize = [0, 0];
  let inspector = null;
  let imageProvider: ImageProvider;

  const bubble = writableDerived(
    bubbleInspectorTarget,
    (bit) => bit?.bubble,
    (b, bit) => {
      bit.bubble = b;
      return bit;
    }
  );
  const bubblePage = writableDerived(
    bubbleInspectorTarget,
    (bit) => bit?.page,
    (b, bit) => {
      bit.page = b;
      return bit;
    }
  );
  const fontSizeStore = writableDerived(
  	bubbleInspectorTarget,
  	(bit) => bit?.bubble.getPhysicalFontSize(bit.page.paperSize),
  	(fs, bit) => {
      bit.bubble.setPhysicalFontSize(bit.page.paperSize, fs);
      return bit;
    }
  );
  const outlineWidth = writableDerived(
  	bubbleInspectorTarget,
  	(bit) => bit?.bubble.getPhysicalOutlineWidth(bit.page.paperSize),
  	(ow, bit) => {
      bit.bubble.setPhysicalOutlineWidth(bit.page.paperSize, ow);
      return bit;
    }
  );
  const strokeWidth = writableDerived(
  	bubbleInspectorTarget,
  	(bit) => bit?.bubble.getPhysicalStrokeWidth(bit.page.paperSize),
  	(sw, bit) => {
      bit.bubble.setPhysicalStrokeWidth(bit.page.paperSize, sw);
      return bit;
    }
  );

  let fontSize = $fontSizeStore;
  fontSizeStore.subscribe((v) => fontSize = v);
  $: $fontSizeStore = fontSize;

  $:onWindowResize(innerWidth, innerHeight);
  function onWindowResize(w: number, h: number) {
    if (w < adjustedPosition.x + inspectorSize[0] + 16) {
      adjustedPosition.x = w - inspectorSize[0] - 16;
    }
    if (h < adjustedPosition.y + inspectorSize[1] + 16) {
      adjustedPosition.y = h - inspectorSize[1] - 16;
    }
  }

  $:move($bubbleInspectorPosition, inspectorSize);
  function move(p: BubbleInspectorPosition, dialogSize) {
    if (!p) {return;}
    if (pinned) {return;}

    const { center, height, offset } = p;
    adjustedPosition = { 
      x: Math.floor(center.x - dialogSize[0] * 0.5), 
      y: Math.floor(center.y + (offset === 1 ? height*0.5 + 40 : -(height*0.5 + 40 + dialogSize[1])))
    };
  }

  $:onChangeBubble($bubble);
  async function onChangeBubble(b: Bubble) {
    if (b === oldBubble) {return;}
    oldBubble = b;
    if (b) {
      $chosenShape = b.shape;
      await tick();
      textarea.focus({preventScroll: true});
      textarea.select();
      inspectorSize = [inspector.offsetWidth, inspector.offsetHeight];
    }
  }

  $:onChangeShape($chosenShape);
  function onChangeShape(s: string) {
    if ($bubble && $bubble.shape !== s) {
      console.log("onChangeShape", s);
      $bubble.shape = s;
      $bubble.initOptions();
    }
  }

  $:onChangeFont($chosenFont);
  function onChangeFont(f: { fontFamily: string, fontWeight: string }) {
    if ($bubble && f && ($bubble.fontFamily !== f.fontFamily || $bubble.fontWeight !== f.fontWeight)) {
      $bubble.fontFamily = f.fontFamily;
      $bubble.fontWeight = f.fontWeight;
    }
  }

  function onDrag({offsetX, offsetY}) {
    adjustedPosition = {x: offsetX, y: offsetY};
  }

  function chooseShape() {
    $shapeChooserOpen = true;
  }

  function reset() {
    if (!$bubble) { return; }
    $bubble.reset();
    $bubble.initOptions();
    $bubble = $bubble;    
    $chosenShape = $bubble.shape;
  }

  function split() {
    $bubbleSplitCursor = textarea.selectionStart;
  }

  function onKeyPress(event: KeyboardEvent) {
    if (event.shiftKey && event.key === "Enter") {
      event.preventDefault();
      split();
    }
  }

  async function saveTemplate() {
    $newBubbleToken = $bubble;
  }

  function onCommit() {
    $bubble = $bubble;    
  }

  function onScribble(e: CustomEvent<Film>) {
  }

  async function onGenerate() {
    const r = await imageProvider.run($bubble.prompt, $bubble.filmStack, $bubble.gallery);
  }

  function onPunch(e: CustomEvent<Film>) {
  }
</script>

<svelte:window bind:innerWidth bind:innerHeight/>

{#if $bubble}
{@const bubbleSize = $bubble.getPhysicalSize($bubblePage.paperSize)}
<div class="bubble-inspector-container">
  <div class="bubble-inspector variant-glass-surface rounded-container-token vbox gap" use:draggable={{ position: adjustedPosition, onDrag: onDrag ,handle: '.title-bar'}} bind:this={inspector}>    
    <div class="title-bar variant-filled-surface rounded-container-token">
      <img class="title-image" src={bubbleIcon} alt="title"/>
      <div class="bubble-size">{Math.round(bubbleSize[0])}x{Math.round(bubbleSize[1])}</div>
      {#if pinned}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img class="pin-image" src={whitePinIcon} alt="pin" on:click={() => pinned = false} use:toolTip={"場所の固定"}/>
      {:else}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img class="pin-image" src={pinIcon} alt="pin" on:click={() => pinned = true} use:toolTip={"場所の固定"}/>
      {/if}
    </div>

    <div class="hbox gap-x-2 expand">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="hbox expand selected-font variant-ghost-primary rounded-container-token grow" on:click={() => $fontChooserOpen = true}>{$bubble.fontFamily}</div>
      <div class="direction hbox" use:toolTip={"縦書き/横書き"}>
        <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
          <RadioItem bind:group={$bubble.direction} name="justify" value={'v'}><img class="direction-item" src={verticalIcon} alt="title" width="12" height="12"/></RadioItem>
          <RadioItem bind:group={$bubble.direction} name="justify" value={'h'}><img class="direction-item" src={horizontalIcon} alt="title" width="12" height="12"/></RadioItem>
        </RadioGroup>
      </div>
      <input class="checkbox" type="checkbox" use:toolTip={"自動改行"} bind:checked={$bubble.autoNewline}/>
    </div>

    <div class="hbox px-2 variant-ghost-primary rounded-container-token font-color-picker" style="align-self: stretch;">
      <div class="font-bold slider-label">T</div>
      <div class="hbox gap-0.5" use:toolTip={"フォントサイズ"}>
        <ExponentialRangeSlider name="fontsize" bind:value={fontSize} exponentialMin={100} step={1}/>
        <div class="text-xs slider-value-text">
          <div class="number-box"><NumberEdit bind:value={fontSize} min={1} max={999}/></div>
        </div>  
        <span style="width:20px;" use:toolTip={"フォント色"}><ColorPicker bind:hex={$bubble.fontColor} label="" /></span>
      </div>
      <span class="mx-2">/</span>
      <div class="hbox gap-0.5" use:toolTip={"フチの太さ"}>
        <span>フチ</span>
        <RangeSlider name="outlinewidth" bind:value={$outlineWidth} max={20} step={1} style="width:50px;"/>
        <span style="width:20px;" use:toolTip={"フチの色"}><ColorPicker bind:hex={$bubble.outlineColor} label="" /></span>
      </div>
    </div>

    <div class="hbox expand gap-2">
      <textarea
        class="my-2 rounded-container-token textarea" 
        bind:value={$bubble.text}
        bind:this={textarea}
        on:keypress={onKeyPress}/>
      <!-- style="font-family: {fontFamily}; font-weight: {fontWeight}; font-size: {fontSize}px;" -->
      <div class="vbox gap-2">
        <BubbleSample size={[64,96]} bind:shape={$chosenShape} on:click={chooseShape}/>
        <button class="save-button btn btn-sm variant-filled paper-size" on:click={saveTemplate}>SAVE</button>
      </div>
    </div>

    <div class="hbox px-2 variant-ghost-secondary rounded-container-token font-color-picker" style="align-self: stretch;">
      <div class="hbox" use:toolTip={"フキダシ背景色"}>
        <div class="font-bold slider-label">fill</div>
        <ColorPicker bind:hex={$bubble.fillColor} label="" />
      </div>
      <div class="hbox" use:toolTip={"フキダシ枠の色"}>
        <div class="font-bold slider-label">stroke</div>
        <ColorPicker bind:hex={$bubble.strokeColor} label="" />
      </div>
      <div class="hbox" use:toolTip={"フキダシ枠の太さ"}>
        <RangeSlider name="line" bind:value={$strokeWidth} max={10} step={1} style="width:100px;"/>
      </div>
      <div class="embed hbox" use:toolTip={"フキダシ埋め込み"}>
        <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
          <RadioItem bind:group={$bubble.embedded} name="embed" value={false}><img class="embed-item" src={unembeddedIcon} alt="embedded" width="12" height="12"/></RadioItem>
          <RadioItem bind:group={$bubble.embedded} name="embed" value={true}><img class="embed-item" src={embeddedIcon} alt="unembedded" width="12" height="12"/></RadioItem>
        </RadioGroup>
      </div> 
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img class="reset-image" src={resetIcon} alt="reset" on:click={reset} use:toolTip={"リセット"}/>
    </div>
    <BubbleInspectorAppendix/>
    <div class="movie-option-panel px-2 variant-ghost-tertiary rounded-container-token font-color-picker">
      <img class="movie-option-panel-icon" src={movieIcon} alt="movie"/>
      <div class="hbox gap-2 grow left" use:toolTip={"ビデオ作成時のディレイ"}>
        <span class="w-24 text-left">出現ディレイ</span>
        <div style="width: 140px;">
          <RangeSlider name="delay" bind:value={$bubble.appearanceDelay} min={0} max={10} step={0.1}/>
        </div>
        <div class="number-box"><NumberEdit bind:value={$bubble.appearanceDelay} min={0} max={10} allowDecimal={true}/></div>
      </div>
    </div>
    <details class="w-full text-left">
      <summary>レイヤー</summary>
      <FilmList filmStack={$bubble.filmStack} on:commit={onCommit} on:scribble={onScribble} on:generate={onGenerate} on:punch={onPunch}/>
    </details>
  </div>
</div>
{/if}

<ImageProvider bind:this={imageProvider}/>

<style>
  .bubble-inspector-container {
    position: absolute;
    top: 0;
    left: 0;
  }
  .bubble-inspector {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 350px;
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
    height: 120px;
  }
  .number-box {
    width: 30px;
    height: 20px;
    display: inline-block;
    text-align: right;
    font-size: 12px;
  }
  .selected-font:hover {
    color: rgb(128, 93, 47);
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
  .reset-image {
    width: 24px;
    height: 24px;
    margin-left: 4px;
    cursor: pointer;
  }
  .slider-label {
    margin-left: 4px;
    margin-right: 2px;
  }
  .save-button {
    height: 12px;
  }
  .movie-option-panel {
    position: relative;
    align-self: stretch;
    display: flex;
    align-items: left;
    font-size: 14px;
  }
  .movie-option-panel-icon {
    position: absolute;
    width: 24px;
    height: 24px;
    top: -10px;
    right: 4px;
  }
</style>
