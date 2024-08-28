<script lang="ts">
  import writableDerived from "svelte-writable-derived";
  import NumberEdit from '../../utils/NumberEdit.svelte';
  import '../../box.css';
  import BubbleSample from './BubbleSample.svelte';
  import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import ExponentialRangeSlider from '../../utils/ExponentialRangeSlider.svelte';
	import ColorPickerLabel from '../../utils/colorpicker/ColorPickerLabel.svelte';
  import { tick } from 'svelte';
  import { toolTip } from '../../utils/passiveToolTipStore';
  import { fontChooserOpen, chosenFont } from './fontStore';
  import { shapeChooserOpen, chosenShape } from './shapeStore';
  import BubbleInspectorAppendix from './BubbleInspectorAppendix.svelte';
  import { Bubble } from "../../lib/layeredCanvas/dataModels/bubble";
  import type { Film } from "../../lib/layeredCanvas/dataModels/film";
  import { bubbleInspectorTarget, bubbleSplitCursor } from './bubbleInspectorStore';
  import { saveBubbleToken } from '../../filemanager/fileManagerStore';
  import FilmList from "../frameinspector/FilmList.svelte";
  import ImageProvider from '../../generator/ImageProvider.svelte';
  import { dominantMode } from "../../uiStore";
  import { redrawToken, forceFontLoadToken } from "../bookStore";
  import Drawer from "../../utils/Drawer.svelte";
  import { bookEditor } from "../bookStore";
  import { selection, type SelectionInfo } from '../../utils/selection';


  import horizontalIcon from '../../assets/horizontal.png';
  import verticalIcon from '../../assets/vertical.png';
  import embeddedIcon from '../../assets/embedded.png';
  import unembeddedIcon from '../../assets/unembedded.png';

  let innerWidth = window.innerWidth;
  let innerHeight = window.innerHeight;
  let oldBubble = null;
  let textarea = null;
  let imageProvider: ImageProvider;
  let bubbleSnapshot: string = null;
  let textSelection: SelectionInfo = null;
  let textSelected = false;
  let drawerContent: HTMLDivElement;

  const bubble = writableDerived(
    bubbleInspectorTarget,
    (bit) => bit?.bubble,
    (b, bit) => {
      bit.bubble = b;
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

  $: opened = $dominantMode != "painting" && $bubble != null;

  $: onOpen(opened);
  async function onOpen(o: boolean) {
    if (o) {
      await tick();
      console.log(innerHeight);
      if (1200 < innerHeight) {
        // open all details under this component
        const details = drawerContent.querySelectorAll("details");
        for (let detail of details) {
          detail.setAttribute("open", "");
        }
      }
    }
  }

  let fontSize = $fontSizeStore;
  fontSizeStore.subscribe((v) => fontSize = v);
  $: $fontSizeStore = fontSize;

  $:onChangeBubble($bubble);
  async function onChangeBubble(b: Bubble) {
    if (b === oldBubble) {
      if (bubbleSnapshot && b) {
        const snapshot = makeSnapshot(b);
        if (bubbleSnapshot !== snapshot) {
          bubbleSnapshot = snapshot;
          $forceFontLoadToken = true;
          $redrawToken = true;
          $bookEditor.commit("bubble");
        }
      }
    } else {
      oldBubble = b;
      if (b) {
        $chosenShape = b.shape;
        await tick();
        textarea.focus({preventScroll: true});
        textarea.select();
        bubbleSnapshot = makeSnapshot(b);
      } else {
        bubbleSnapshot = null;
      }
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
      $forceFontLoadToken = true;
    }
  }

  function makeSnapshot(b: Bubble) {
    let films = [];
    for (let film of b.filmStack.films) {
      const f = {
        media: film.media.fileId,
        n_scale: film.n_scale,
        n_translation: film.n_translation,
        rotation: film.rotation,
        reverse: film.reverse,
        visible: film.visible,
        prompt: film.prompt,
      }
      films.push(f);
    }
    const jsonObject = Bubble.decompile(b);
    jsonObject.films = films;
    return JSON.stringify(jsonObject);
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
    $saveBubbleToken = $bubble;
  }

  function onCommit(e: CustomEvent<boolean>) {
    console.log("onCommit", e.detail);
    $bookEditor.commit(e.detail ? null : "effect");
  }

  function onScribble(e: CustomEvent<Film>) {
    $bubbleInspectorTarget.commandTargetFilm = e.detail;
    $bubbleInspectorTarget.command = "scribble";
  }

  async function onGenerate(e: CustomEvent<Film>) {
    $bubbleInspectorTarget.commandTargetFilm = e.detail;
    $bubbleInspectorTarget.command = "generate";
  }

  function onPunch(e: CustomEvent<Film>) {
    $bubbleInspectorTarget.commandTargetFilm = e.detail;
    $bubbleInspectorTarget.command = "punch";
  }

  function onSelectionChanged(info: SelectionInfo) {
    textSelection = info;
    textSelected = info.hasSelection;
  }

  function wrapRange(range: SelectionInfo, prefix: string, suffix: string) {
    const start = range.start;
    const end = range.end;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);
    const wrapped = prefix + selected + suffix;
    const newText = before + wrapped + after;
    textarea.value = newText;
    textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    $bubble.text = newText;
  }

  function onWrapColor() {
    wrapRange(textSelection, "{", "|red}");
  }

  function onWrapRuby() {
    wrapRange(textSelection, "[", "](ルビ)");
  }

  function onWrapRotation() {
    wrapRange(textSelection, "<<", ">>");
  }
</script>

<svelte:window bind:innerWidth bind:innerHeight/>

<div class="drawer-outer">
  <Drawer placement={"left"} open={opened} overlay={false} size="350px" on:clickAway={close}>
    <div class="drawer-content" bind:this={drawerContent}>
      <details open>
        <summary>全体</summary>
        <div class="section">
          <div class="flex flex-row items-center gap-1">
            <div class="label">コマへの埋め込み</div>
            <div class="embed hbox" use:toolTip={"フキダシ埋め込み"}>
              <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
                <RadioItem bind:group={$bubble.embedded} name="embed" value={false}><img class="embed-item" src={unembeddedIcon} alt="embedded" width="12" height="12"/></RadioItem>
                <RadioItem bind:group={$bubble.embedded} name="embed" value={true}><img class="embed-item" src={embeddedIcon} alt="unembedded" width="12" height="12"/></RadioItem>
              </RadioGroup>
            </div> 
            <div class="ml-2">
              <button class="btn btn-sm bg-warning-500 h-6" on:click={reset}>リセット</button>
            </div>
          </div>
        </div>
      </details>

      <details open>
        <summary>テキスト</summary>
        <div class="section">
          <h2>スタイル</h2>
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="self-stretch selected-font variant-ghost-primary rounded-container-token text-center" on:click={() => $fontChooserOpen = true}>
            <span style="font-family: {$bubble.fontFamily};">{$bubble.fontFamily}</span>
          </div>
          <div class="flex gap-2 items-center">
            <div class="label">縦書き/横書き</div>
            <div class="direction hbox" use:toolTip={"縦書き/横書き"}>
              <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
                <RadioItem bind:group={$bubble.direction} name="justify" value={'v'}><img class="direction-item" src={verticalIcon} alt="title" width="12" height="12"/></RadioItem>
                <RadioItem bind:group={$bubble.direction} name="justify" value={'h'}><img class="direction-item" src={horizontalIcon} alt="title" width="12" height="12"/></RadioItem>
              </RadioGroup>
            </div>
            <div class="label">自動改行</div>
            <input class="checkbox" type="checkbox" use:toolTip={"自動改行"} bind:checked={$bubble.autoNewline}/>
          </div>
          <div class="flex items-center gap-1" use:toolTip={"フォントサイズ"}>
            <div class="label">フォントサイズ</div>
              <ExponentialRangeSlider name="fontsize" bind:value={fontSize} exponentialMin={100} step={1}/>
              <div class="text-xs slider-value-text">
                <div class="number-box"><NumberEdit bind:value={fontSize} min={1} max={999}/></div>
              </div>  
          </div>
          <h2>カラー</h2>
          <div class="flex items-center">
            <div class="label">塗りつぶし</div>
            <div class="color-label" use:toolTip={"フォント色"}>
              <ColorPickerLabel bind:hex={$bubble.fontColor}/>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="label">フチの太さ</div>
            <RangeSlider name="outlinewidth" bind:value={$outlineWidth} max={20} step={1} style="width:80px;"/>
            <div class="label">フチの色</div>
            <div class="color-label" use:toolTip={"フチの色"}>
              <ColorPickerLabel bind:hex={$bubble.outlineColor}/>
            </div>
          </div>
          <h2>レイアウト</h2>
          <div class="flex items-center gap-1" use:toolTip={"行間"}>
            <div class="label">行間</div>
              <RangeSlider name="lineskip" bind:value={$bubble.lineSkip} min={-1} max={5} step={0.1}/>
              <div class="text-xs slider-value-text">
                <div class="number-box"><NumberEdit bind:value={$bubble.lineSkip} min={-1} max={5} allowDecimal={true}/></div>
              </div>  
          </div>
          <div class="flex items-center gap-1" use:toolTip={"字間(現在は縦書きのみ有効)"}>
            <div class="label">字間</div>
            <RangeSlider name="charskip" bind:value={$bubble.charSkip} min={-1} max={5} step={0.1}/>
            <div class="text-xs slider-value-text">
                <div class="number-box"><NumberEdit bind:value={$bubble.charSkip} min={-1} max={5} allowDecimal={true}/></div>
              </div>  
          </div>
          <h2>ルビ</h2>
          <div class="flex items-center gap-1" use:toolTip={"行間"}>
            <div class="label">ルビ サイズ</div>
              <RangeSlider name="lineskip" bind:value={$bubble.rubySize} min={0} max={1} step={0.05}/>
              <div class="text-xs slider-value-text">
                <div class="number-box"><NumberEdit bind:value={$bubble.rubySize} min={0} max={1} allowDecimal={true}/></div>
              </div>  
          </div>
          <div class="flex items-center gap-1" use:toolTip={"字間(現在は縦書きのみ有効)"}>
            <div class="label">ルビ 間隔</div>
            <RangeSlider name="charskip" bind:value={$bubble.rubyDistance} min={0} max={1} step={0.05}/>
            <div class="text-xs slider-value-text">
                <div class="number-box"><NumberEdit bind:value={$bubble.rubyDistance} min={0} max={1} allowDecimal={true}/></div>
              </div>  
          </div>
          <h2>内容</h2>
          <textarea
            class="rounded-container-token textarea" 
            bind:value={$bubble.text}
            bind:this={textarea}
            on:keypress={onKeyPress}
            use:selection={onSelectionChanged}/>
          <div class="btn-group variant-filled-primary h-6">
            <button disabled={!textSelected} on:click={onWrapColor}><span class="text-sm text-white">色</span></button>
            <button disabled={!textSelected} on:click={onWrapRuby}><span class="text-sm text-white">ルビ</span></button>
            <button disabled={!textSelected} on:click={onWrapRotation}><span class="text-sm text-white">回転</span></button>
          </div>
        </div>
      </details>

      <details open>
        <summary>シェイプ</summary>
        <div class="section">
          <div class="flex gap-2">
            <div>
              <BubbleSample size={[64,96]} bind:shape={$chosenShape} on:click={chooseShape}/>
              <button class="save-button btn btn-sm variant-filled paper-size" on:click={saveTemplate}>SAVE</button>
            </div>
            <div>
              <div class="flex items-center">
                <div class="label">塗りつぶし</div>
                <div class="color-label" use:toolTip={"フキダシ背景色"}>
                  <ColorPickerLabel bind:hex={$bubble.fillColor}/>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <div class="label">線の太さ</div>
                <RangeSlider name="outlinewidth" bind:value={$strokeWidth} max={20} step={1} style="width:80px;"/>
                <div class="label">線の色</div>
                <div class="color-label" use:toolTip={"フキダシのフチの色"}>
                  <ColorPickerLabel bind:hex={$bubble.strokeColor}/>
                </div>
              </div>
            </div>
          </div>
        </div>  
      </details>

      <details>
        <summary>シェイプパラメータ</summary>
        <div class="section">
          <BubbleInspectorAppendix/>
        </div>
      </details>

      <details>
        <summary>ビデオパラメータ</summary>
        <div class="section">
          <div class="self-stretch variant-ghost-tertiary rounded-container-token pl-2">
            <div class="hbox gap-2 grow left" use:toolTip={"ビデオ作成時のディレイ"}>
              <span class="w-24 text-left">出現ディレイ</span>
              <div style="width: 140px;">
                <RangeSlider name="delay" bind:value={$bubble.appearanceDelay} min={0} max={10} step={0.1}/>
              </div>
              <div class="number-box"><NumberEdit bind:value={$bubble.appearanceDelay} min={0} max={10} allowDecimal={true}/></div>
            </div>
          </div>
        </div>
      </details>

      <h1>レイヤー</h1>
      <div class="w-full text-left">
        <FilmList filmStack={$bubble.filmStack} on:commit={onCommit} on:scribble={onScribble} on:generate={onGenerate} on:punch={onPunch}/>
      </div>
    </div>
  </Drawer>
</div>

<ImageProvider bind:this={imageProvider}/>

<style>
  .drawer-content {
    width: 350px;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 8px;
    gap: 2px;
    overflow-x: hidden;
    overflow-y: auto;
  }
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
  .textarea {
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
  .color-label {
    width: 30px;
    height: 20px;
    margin-left: 4px;
    margin-right: 4px;
  }
  .save-button {
    height: 12px;
  }
  h1 {
    font-family: '源暎エムゴ';
    font-size: 18px;
    margin-bottom: 8px;
  }
  h2 {
    font-family: '源暎エムゴ';
    font-size: 16px;
    line-height: normal;
  }
  .section {
    margin-left: 16px;
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    align-items: start;
    gap: 4px;
  }
  summary {
    font-family: '源暎エムゴ';
    font-size: 18px;
    margin-bottom: 8px;
  }
  .label {
    font-size: 14px;
  }
</style>
