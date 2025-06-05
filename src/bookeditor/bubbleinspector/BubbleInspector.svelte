<script lang="ts">
  import writableDerived from "svelte-writable-derived";
  import NumberEdit from '../../utils/NumberEdit.svelte';
  import '../../box.css';
  import BubbleSample from './BubbleSample.svelte';
  import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import ExponentialRangeSlider from '../../utils/ExponentialRangeSlider.svelte';
  import { _ } from 'svelte-i18n';
	import ColorPickerLabel from '../../utils/colorpicker/ColorPickerLabel.svelte';
  import { tick } from 'svelte';
  import { toolTip } from '../../utils/passiveToolTipStore';
  import { fontChooserOpen, chosenFont } from './fontStore';
  import { shapeChooserOpen, chosenShape } from './shapeStore';
  import BubbleInspectorAppendix from './BubbleInspectorAppendix.svelte';
  import { Bubble, insertBubbleLayers } from "../../lib/layeredCanvas/dataModels/bubble";
  import type { Film } from "../../lib/layeredCanvas/dataModels/film";
  import { bubbleInspectorRebuildToken, bubbleInspectorTarget } from './bubbleInspectorStore';
  import { saveBubbleToken } from '../../filemanager/fileManagerStore';
  import FilmList from "../frameinspector/FilmList.svelte";
  import ImageProvider from '../../generator/ImageProvider.svelte';
  import { dominantMode } from "../../uiStore";
  import { redrawToken, fontLoadToken } from "../workspaceStore";
  import Drawer from "../../utils/Drawer.svelte";
  import { bookOperators } from "../workspaceStore";
  import { selection, type SelectionInfo } from '../../utils/selection';
  import { transformText } from '../../supabase';
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { onlineStatus } from "../../utils/accountStore";

  import horizontalIcon from '../../assets/horizontal.webp';
  import verticalIcon from '../../assets/vertical.webp';
  import embeddedIcon from '../../assets/embedded.webp';
  import unembeddedIcon from '../../assets/unembedded.webp';

  let innerWidth = window.innerWidth;
  let innerHeight = window.innerHeight;
  let oldBubble: Bubble | null = null;
  let textarea: HTMLTextAreaElement | null = null;
  let imageProvider: ImageProvider;
  let bubbleSnapshot: string | null = null;
  let textSelection: SelectionInfo | null = null;
  let textSelected = false;
  let drawerContent: HTMLDivElement;
  let transformTextMethod = "translateToEnglish";
  let transforming = false;

  const bubble = writableDerived(
    bubbleInspectorTarget,
    (bit) => bit?.bubble ?? null,
    (b, bit) => {
      bit!.bubble = b!;
      return bit;
    }
  );
  const fontSizeStore = writableDerived(
  	bubbleInspectorTarget,
  	(bit) => bit?.bubble.getPhysicalFontSize(bit.page.paperSize) ?? 12,
  	(fs, bit) => {
      bit!.bubble.setPhysicalFontSize(bit!.page.paperSize, fs!);
      return bit;
    }
  );
  const outlineWidth = writableDerived(
  	bubbleInspectorTarget,
  	(bit) => bit?.bubble.getPhysicalOutlineWidth(bit.page.paperSize),
  	(ow, bit) => {
      bit!.bubble.setPhysicalOutlineWidth(bit!.page.paperSize, ow!);
      return bit;
    }
  );
  const strokeWidth = writableDerived(
  	bubbleInspectorTarget,
  	(bit) => bit?.bubble.getPhysicalStrokeWidth(bit.page.paperSize),
  	(sw, bit) => {
      bit!.bubble.setPhysicalStrokeWidth(bit!.page.paperSize, sw!);
      return bit;
    }
  );
  const appearanceDelay = writableDerived(
  	bubbleInspectorTarget,
  	(bit) => bit?.bubble.appearanceDelay ?? 0,
  	(fs, bit) => {
      bit!.bubble.appearanceDelay = fs!;
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

  function reset() {
    if (!$bubble) { return; }
    $bubble.reset();
    $bubble.initOptions();
    $chosenShape = $bubble.shape;
    bubble.update(b => b);
  }

  $:onChangeShape($chosenShape);
  function onChangeShape(s: string | null) {
    if (s != null && $bubble && $bubble.shape !== s) {
      console.log("onChangeShape", s);
      $bubble.shape = s;
      $bubble.initOptions();
    }
  }

  $:onChangeFont($chosenFont);
  function onChangeFont(f: { fontFamily: string, fontWeight: string } | null) {
    if ($bubble && f && ($bubble.fontFamily !== f.fontFamily || $bubble.fontWeight !== f.fontWeight)) {
      $bubble.fontFamily = f.fontFamily;
      $bubble.fontWeight = f.fontWeight;
      $fontLoadToken = [{ family: f.fontFamily, weight: f.fontWeight }];
    }
  }

  $:onChangeBubble($bubble);
  async function onChangeBubble(b: Bubble | null) {
    if (b === oldBubble) {
      if (bubbleSnapshot && b) {
        const snapshot = makeSnapshot(b);
        if (bubbleSnapshot !== snapshot) {
          bubbleSnapshot = snapshot;
          $redrawToken = true;
          $bookOperators!.commit("bubble");
        }
      }
    } else {
      oldBubble = b;
      if (b) {
        $chosenShape = b.shape;
        await tick();
        bubbleSnapshot = makeSnapshot(b);
        // 新規作成じなど。ロード済みなら特に何もおきない
        $fontLoadToken = [{ family: b.fontFamily, weight: b.fontWeight }];
      } else {
        bubbleSnapshot = null;
      }
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

  function split() {
    if ($bubbleInspectorTarget && textarea) {
      const cursor = textarea.selectionStart;
      $bubbleInspectorTarget = {
        ...$bubbleInspectorTarget,
        command: "split",
        commandArgs: { cursor }
      };
    }
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
    $bookOperators!.commit(e.detail ? null : "effect");
  }

  function onScribble(e: CustomEvent<Film>) {
    $bubbleInspectorTarget!.commandTargetFilm = e.detail;
    $bubbleInspectorTarget!.command = "scribble";
  }

  async function onGenerate(e: CustomEvent<Film>) {
    $bubbleInspectorTarget!.commandTargetFilm = e.detail;
    $bubbleInspectorTarget!.command = "generate";
  }

  function onPunch(e: CustomEvent<Film>) {
    $bubbleInspectorTarget!.commandTargetFilm = e.detail;
    $bubbleInspectorTarget!.command = "punch";
  }

  function onUpscale(e: CustomEvent<Film>) {
    $bubbleInspectorTarget!.commandTargetFilm = e.detail;
    $bubbleInspectorTarget!.command = "upscale";
  }

  function onDuplicate(e: CustomEvent<Film>) {
    const page = $bubbleInspectorTarget!.page;
    const b = $bubbleInspectorTarget!.bubble;
    const film = e.detail;
    const filmStack = b.filmStack;
    const index = filmStack.films.indexOf(film);
    const newFilm = film.clone();
    const paperSize = page.paperSize;
    insertBubbleLayers(paperSize, b, index, [newFilm]);

    bubble.update(b => b);
    $bookOperators!.commit(null);
  }

  function onVideo(e: CustomEvent<Film>) {
    $bubbleInspectorTarget!.commandTargetFilm = e.detail;
    $bubbleInspectorTarget!.command = "video";
  }

  function onAccept(e: CustomEvent<{index: number, films: Film[]}>) {
    const {index, films} = e.detail;
    const page = $bubbleInspectorTarget!.page;
    const b = $bubbleInspectorTarget!.bubble;
    const paperSize = page.paperSize;
    insertBubbleLayers(paperSize, b, index, films);

    bubble.update(b => b);
    $bookOperators!.commit(null);
  }

  function onEraser(e: CustomEvent<Film>) {
    $bubbleInspectorTarget!.commandTargetFilm = e.detail;
    $bubbleInspectorTarget!.command = "eraser";
  }

  function onInpaint(e: CustomEvent<Film>) {
    $bubbleInspectorTarget!.commandTargetFilm = e.detail;
    $bubbleInspectorTarget!.command = "inpaint";
  }

  function onTextEdit(e: CustomEvent<Film>) {
    $bubbleInspectorTarget!.commandTargetFilm = e.detail;
    $bubbleInspectorTarget!.command = "textedit";
  }

  function onTool(e: CustomEvent<{tool: string, film: Film}>) {
    const { tool, film } = e.detail;
    switch(tool) {
      case "punch":
        onPunch({ detail: film } as CustomEvent<Film>);
        break;
      case "upscale":
        onUpscale({ detail: film } as CustomEvent<Film>);
        break;
      case "video":
        onVideo({ detail: film } as CustomEvent<Film>);
        break;
      case "eraser":
        onEraser({ detail: film } as CustomEvent<Film>);
        break;
      case "inpaint":
        onInpaint({ detail: film } as CustomEvent<Film>);
        break;
      case "textedit":
        onTextEdit({ detail: film } as CustomEvent<Film>);
        break;
      case "scribble":
        onScribble({ detail: film } as CustomEvent<Film>);
        break;
      case "duplicate":
        onDuplicate({ detail: film } as CustomEvent<Film>);
        break;
    }
  }

  function onSelectionChanged(info: SelectionInfo) {
    textSelection = info;
    textSelected = info.hasSelection;
  }

  function onFocus() {
    textarea?.select();    
  }

  function wrapRange(range: SelectionInfo, prefix: string, suffix: string) {
    if (!textarea) {
      return;
    }
    const start = range.start;
    const end = range.end;
    const text = textarea!.value;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);
    const wrapped = prefix + selected + suffix;
    const newText = before + wrapped + after;
    textarea!.value = newText;
    textarea!.setSelectionRange(start + prefix.length, end + prefix.length);
    $bubble!.text = newText;
  }

  function onWrapColor() {
    wrapRange(textSelection!, "{", "|red}");
  }

  function onWrapRuby() {
    wrapRange(textSelection!, "[", "](ルビ)");
  }

  function onWrapRotation() {
    wrapRange(textSelection!, "<<", ">>");
  }

  async function onTransformText() {
    if ($onlineStatus !== 'signed-in') {
      toastStore.trigger({ message: $_('bubble.notLoggedIn'), timeout: 3000});
      return;
    }
    console.log("onTransformText", transformTextMethod, $bubble!.text);
    transforming = true;
    const r = await transformText({method:transformTextMethod, text:$bubble!.text});
    console.log(r);
    transforming = false;
    $bubble!.text = r.text;
    if (transformTextMethod == "translateToEnglish") {
      $bubble!.direction = "h";
    }
  }
</script>

<svelte:window bind:innerWidth bind:innerHeight/>

<div class="drawer-outer">
  <Drawer placement={"left"} open={opened} overlay={false} size="350px" on:clickAway={close}>
    {#if $bubble}
    <div class="drawer-content" bind:this={drawerContent}>
      <details open>
        <summary>{$_('bubble.overall')}</summary>
        <div class="section">
          <div class="flex flex-row items-center gap-1">
            <div class="label">{$_('bubble.embedToFrame')}</div>
            <div class="embed hbox" use:toolTip={$_('bubble.embedded')}>
              <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
                <RadioItem bind:group={$bubble.embedded} name="embed" value={false}><img class="embed-item" src={unembeddedIcon} alt="embedded" width="12" height="12"/></RadioItem>
                <RadioItem bind:group={$bubble.embedded} name="embed" value={true}><img class="embed-item" src={embeddedIcon} alt="unembedded" width="12" height="12"/></RadioItem>
              </RadioGroup>
            </div> 
            <div class="ml-2">
              <button class="btn btn-sm bg-warning-500 h-6" on:click={reset}>{$_('bubble.reset')}</button>
            </div>
          </div>
        </div>
      </details>

      <details open>
        <summary>{$_('bubble.text')}</summary>
        <div class="section">
          <h2>{$_('bubble.style')}</h2>
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="self-stretch selected-font variant-ghost-primary rounded-container-token text-center" on:click={() => $fontChooserOpen = true}>
            <span style="font-family: {$bubble.fontFamily};">{$bubble.fontFamily}</span>
          </div>
          <div class="flex gap-2 items-center">
            <div class="label">{$_('bubble.verticalHorizontal')}</div>
            <div class="direction hbox" use:toolTip={$_('bubble.verticalHorizontal')}>
              <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
                <RadioItem bind:group={$bubble.direction} name="justify" value={'v'}><img class="direction-item" src={verticalIcon} alt="title" width="12" height="12"/></RadioItem>
                <RadioItem bind:group={$bubble.direction} name="justify" value={'h'}><img class="direction-item" src={horizontalIcon} alt="title" width="12" height="12"/></RadioItem>
              </RadioGroup>
            </div>
            <div class="label">{$_('bubble.autoNewline')}</div>
            <input class="checkbox" type="checkbox" use:toolTip={$_('bubble.autoNewline')} bind:checked={$bubble.autoNewline}/>
          </div>
          <div class="flex items-center gap-1" use:toolTip={$_('bubble.fontSize')}>
            <div class="label">{$_('bubble.fontSize')}</div>
              <ExponentialRangeSlider name="fontsize" bind:value={fontSize} exponentialMin={100} step={1}/>
              <div class="text-xs slider-value-text">
                <div class="number-box"><NumberEdit bind:value={fontSize} min={1} max={999}/></div>
              </div>  
          </div>
          <h2>{$_('bubble.color')}</h2>
          <div class="flex items-center">
            <div class="label">{$_('bubble.fill')}</div>
            <div class="color-label" use:toolTip={$_('bubble.fontColor')}>
              <ColorPickerLabel bind:hex={$bubble.fontColor}/>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="label">{$_('bubble.outlineWidth')}</div>
            <RangeSlider name="outlinewidth" bind:value={$outlineWidth} max={20} step={1} style="width:80px;"/>
            <div class="label">{$_('bubble.outlineColor')}</div>
            <div class="color-label" use:toolTip={$_('bubble.outlineColor')}>
              <ColorPickerLabel bind:hex={$bubble.outlineColor}/>
            </div>
          </div>
          <h2>{$_('bubble.layout')}</h2>
          <div class="flex items-center gap-1" use:toolTip={$_('bubble.lineSpacing')}>
            <div class="label">{$_('bubble.lineSpacing')}</div>
              <RangeSlider name="lineskip" bind:value={$bubble.lineSkip} min={-1} max={5} step={0.1}/>
              <div class="text-xs slider-value-text">
                <div class="number-box"><NumberEdit bind:value={$bubble.lineSkip} min={-1} max={5} allowDecimal={true}/></div>
              </div>  
          </div>
          <div class="flex items-center gap-1" use:toolTip={$_('bubble.charSpacingTooltip')}>
            <div class="label">{$_('bubble.charSpacing')}</div>
            <RangeSlider name="charskip" bind:value={$bubble.charSkip} min={-1} max={5} step={0.1}/>
            <div class="text-xs slider-value-text">
                <div class="number-box"><NumberEdit bind:value={$bubble.charSkip} min={-1} max={5} allowDecimal={true}/></div>
              </div>  
          </div>
          <h2>{$_('bubble.ruby')}</h2>
          <div class="flex items-center gap-1" use:toolTip={$_('bubble.lineSpacing')}>
            <div class="label">{$_('bubble.rubySize')}</div>
              <RangeSlider name="lineskip" bind:value={$bubble.rubySize} min={0} max={1} step={0.05}/>
              <div class="text-xs slider-value-text">
                <div class="number-box"><NumberEdit bind:value={$bubble.rubySize} min={0} max={1} allowDecimal={true}/></div>
              </div>  
          </div>
          <div class="flex items-center gap-1" use:toolTip={$_('bubble.charSpacingTooltip')}>
            <div class="label">{$_('bubble.rubySpacing')}</div>
            <RangeSlider name="charskip" bind:value={$bubble.rubyDistance} min={0} max={1} step={0.05}/>
            <div class="text-xs slider-value-text">
                <div class="number-box"><NumberEdit bind:value={$bubble.rubyDistance} min={0} max={1} allowDecimal={true}/></div>
              </div>  
          </div>
          <h2>{$_('bubble.content')}</h2>
          {#if transforming}
            <div class="textarea flex items-center justify-center">
              <ProgressRadial stroke={100} width="w-10"/>
            </div>
          {:else}
            <textarea
              class="rounded-container-token textarea" 
              bind:value={$bubble.text}
              bind:this={textarea}
              on:keypress={onKeyPress}
              on:focus={onFocus}
              use:selection={onSelectionChanged}/>
          {/if}
          <div class="btn-group variant-filled-primary h-6">
            <button disabled={!textSelected} on:click={onWrapColor}><span class="text-sm text-white">{$_('bubble.colorButton')}</span></button>
            <button disabled={!textSelected} on:click={onWrapRuby}><span class="text-sm text-white">{$_('bubble.rubyButton')}</span></button>
            <button disabled={!textSelected} on:click={onWrapRotation}><span class="text-sm text-white">{$_('bubble.rotationButton')}</span></button>
          </div>
          <div class="flex flex-row w-full gap-2">
            <select class="select h-8 p-0 w-full" bind:value={transformTextMethod}>
              <option value="translateToEnglish">{$_('bubble.translateToEnglish')}</option>
              <option value="addFurigana">{$_('bubble.addFurigana')}</option>
              <option value="simplifySpeech">{$_('bubble.simplifySpeech')}</option>
            </select>
            <button type="button" class="btn btn-sm variant-filled" on:click={onTransformText}><span class="text-sm text-white" use:toolTip={$_('bubble.aiTextEditTooltip')}>{$_('bubble.applyTransform')}</span></button>
          </div>          
        </div>
      </details>

      <details open>
        <summary>{$_('bubble.shape')}</summary>
        <div class="section">
          <div class="flex gap-2">
            <div>
              <BubbleSample size={[64,96]} bind:shape={$chosenShape} on:click={chooseShape}/>
              <button class="btn btn-sm variant-filled paper-size h-6 mt-2" on:click={saveTemplate}>{$_('bubble.saveTemplate')}</button>
            </div>
            <div class="flex flex-col gap-2">
              <div class="flex items-center">
                <div class="label w-16">{$_('bubble.fill')}</div>
                <div class="color-label" use:toolTip={$_('bubble.backgroundColor')}>
                  <ColorPickerLabel bind:hex={$bubble.fillColor}/>
                </div>
              </div>
              <div class="flex items-center">
                <div class="label w-16">{$_('bubble.strokeWidth')}</div>
                <RangeSlider name="outlinewidth" bind:value={$strokeWidth} max={20} step={1} style="width:80px;"/>
              </div>
              <div class="flex items-center">
                <div class="label w-16">{$_('bubble.lineColor')}</div>
                <div class="color-label" use:toolTip={$_('bubble.strokeColor')}>
                  <ColorPickerLabel bind:hex={$bubble.strokeColor}/>
                </div>
              </div>
            </div>
          </div>
        </div>  
      </details>

      <details>
        <summary>{$_('bubble.shapeParameters')}</summary>
        <div class="section">
          <BubbleInspectorAppendix/>
        </div>
      </details>

      <details>
        <summary>{$_('bubble.videoParameters')}</summary>
        <div class="section">
          <div class="self-stretch variant-ghost-tertiary rounded-container-token pl-2">
            <div class="hbox gap-2 grow left" use:toolTip={$_('bubble.videoDelay')}>
              <span class="w-24 text-left">{$_('bubble.appearanceDelay')}</span>
              <div style="width: 140px;">
                <RangeSlider name="delay" bind:value={$appearanceDelay} min={0} max={10} step={0.1}/>
              </div>
              <div class="number-box"><NumberEdit bind:value={$appearanceDelay} min={0} max={10} allowDecimal={true}/></div>
            </div>
          </div>
        </div>
      </details>

      <h1>{$_('bubble.layer')}</h1>
      <div class="w-full text-left mb-32">
        {#key $bubbleInspectorRebuildToken}
          <FilmList
            showsBarrier={false}
            filmStack={$bubble.filmStack}
            on:commit={onCommit}
            on:generate={onGenerate}
            on:accept={onAccept}
            on:tool={onTool}
            />
        {/key}
      </div>
    </div>
    {/if}
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
