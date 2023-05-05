<script type="ts">
  import { draggable } from '@neodrag/svelte';
  import NumberEdit from './NumberEdit.svelte';
  import './box.css';
  import BubbleSample from './BubbleSample.svelte';
  import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
  import { RangeSlider } from '@skeletonlabs/skeleton';
	import ColorPicker from 'svelte-awesome-color-picker';
  import { tick } from 'svelte';
  import { toolTip } from './passiveToolTipStore';
  import { fontChooserOpen, chosenFont } from './fontStore';
  import { shapeChooserOpen, chosenShape } from './shapeStore';

  import bubbleIcon from './assets/title-bubble.png';
  import horizontalIcon from './assets/horizontal.png';
  import verticalIcon from './assets/vertical.png';
  import whitePinIcon from './assets/pin-white.png';
  import pinIcon from './assets/pin.png';
  import embeddedIcon from './assets/embedded.png';
  import unembeddedIcon from './assets/unembedded.png';
  import resetIcon from './assets/reset.png';


  export let position = { x: 0, y: 0 };
  export let bubble = null;
  let oldBubble = null;
  let adjustedPosition = { x: 0, y: 0 };
  let pinned = true;
  let textarea = null;

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
      $chosenShape = b.shape;
      await tick();
      textarea.focus({preventScroll: true});
      textarea.select();
      pinned = true;
      move(b.position);
    }
  }

  $:onChangeShape($chosenShape);
  function onChangeShape(s) {
    if (bubble && bubble.shape !== s) {
      bubble.shape = s;
      bubble.initOptions();
    }
  }

  $:onChangeFont($chosenFont);
  function onChangeFont(f) {
    if (bubble && f !== f.fontFamily) {
      bubble.fontFamily = f.fontFamily;
      bubble.fontWeight = f.fontWeight;
    }
  }

  function onDrag({offsetX, offsetY}) {
    adjustedPosition = {x: offsetX, y: offsetY};
  }

  function chooseShape() {
    $shapeChooserOpen = true;
  }

  function reset() {
    bubble?.reset();
    bubble = bubble;    
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
      <img class="pin-image" src={whitePinIcon} alt="pin" on:click={() => pinned = false} use:toolTip={"場所の固定"}/>
      {:else}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <img class="pin-image" src={pinIcon} alt="pin" on:click={() => pinned = true} use:toolTip={"場所の固定"}/>
      {/if}
    </div>

    <div class="hbox gap-x-2 expand">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="hbox expand selected-font variant-ghost-primary rounded-container-token grow" on:click={() => $fontChooserOpen = true}>{bubble.fontFamily}</div>
      <div class="direction hbox" use:toolTip={"縦書き/横書き"}>
        <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
          <RadioItem bind:group={bubble.direction} name="justify" value={'v'}><img class="direction-item" src={verticalIcon} alt="title" width="12" height="12"/></RadioItem>
          <RadioItem bind:group={bubble.direction} name="justify" value={'h'}><img class="direction-item" src={horizontalIcon} alt="title" width="12" height="12"/></RadioItem>
        </RadioGroup>
      </div>
      <input class="checkbox" type="checkbox" use:toolTip={"自動改行"} bind:checked={bubble.autoNewline}/>
    </div>

    <div class="hbox px-2 variant-ghost-primary rounded-container-token font-color-picker" style="align-self: stretch;">
      <div class="font-bold slider-label">T</div>
      <div class="hbox" use:toolTip={"フォントサイズ"}>
        <RangeSlider name="fontsize" bind:value={bubble.fontSize} max={100} step={1} style="width:130px;"/>
        <div class="text-xs slider-value-text">
          <div class="number-box"><NumberEdit bind:value={bubble.fontSize} showSlider={false}/></div>
        </div>  
      </div>
      <span style="width:20px;" use:toolTip={"フォント色"}><ColorPicker bind:hex={bubble.fontColor} label="" /></span>
      <span class="mx-2">/</span>フチ
      <div class="hbox" use:toolTip={"フチの太さ"}>
        <RangeSlider name="outlinewidth" bind:value={bubble.outlineWidth} max={20} step={1} style="width:50px;"/>
      </div>
      <span style="width:20px;" use:toolTip={"フチの色"}><ColorPicker bind:hex={bubble.outlineColor} label="" /></span>
    </div>

    <div class="hbox expand gap-2">
      <textarea
        class="my-2 rounded-container-token textarea" 
        bind:value={bubble.text}
        bind:this={textarea}/>
      <!-- style="font-family: {fontFamily}; font-weight: {fontWeight}; font-size: {fontSize}px;" -->
      <BubbleSample width={64} height={96} bind:shape={$chosenShape} on:click={chooseShape}/>
    </div>

    <div class="hbox px-2 variant-ghost-secondary rounded-container-token font-color-picker" style="align-self: stretch;">
      <div class="hbox" use:toolTip={"フキダシ背景色"}>
        <div class="font-bold slider-label">fill</div>
        <ColorPicker bind:hex={bubble.fillColor} label="" />
      </div>
      <div class="hbox" use:toolTip={"フキダシ枠の色"}>
        <div class="font-bold slider-label">stroke</div>
        <ColorPicker bind:hex={bubble.strokeColor} label="" />
      </div>
      <div class="hbox" use:toolTip={"フキダシ枠の太さ"}>
        <RangeSlider name="line" bind:value={bubble.strokeWidth} max={10} step={1} style="width:100px;"/>
      </div>
      <div class="embed hbox" use:toolTip={"フキダシ埋め込み"}>
        <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
          <RadioItem bind:group={bubble.embedded} name="embed" value={false}><img class="embed-item" src={unembeddedIcon} alt="embedded" width="12" height="12"/></RadioItem>
          <RadioItem bind:group={bubble.embedded} name="embed" value={true}><img class="embed-item" src={embeddedIcon} alt="unembedded" width="12" height="12"/></RadioItem>
        </RadioGroup>
      </div> 
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <img class="reset-image" src={resetIcon} alt="reset" on:click={reset} use:toolTip={"リセット"}/>
    </div>
  </div>
</div>
{/if}

<style>
  .bubble-inspector-container {
    position: absolute;
    top: 0;
    left: 0;
  }
  .bubble-inspector {
    position: absolute;
    top: 710px;
    left: 50px;
    width: 350px;
    height: 285px;
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
  .reset-image {
    width: 24px;
    height: 24px;
    margin-left: 4px;
    cursor: pointer;
  }
</style>
