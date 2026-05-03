<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Film, FilmContent } from "../../lib/layeredCanvas/dataModels/film";
  import { Effect, OutlineEffect } from "../../lib/layeredCanvas/dataModels/effect";
  import { redrawToken } from '../workspaceStore';
  import FilmEffect from "./FilmEffect.svelte";
  import { moveInArray } from '../../utils/moveInArray';
  import { sortableList } from '../../utils/sortableList';
  import { filmProcessorQueue } from '../../utils/filmprocessor/filmProcessorStore';
  import { effectChoiceNotifier } from '../effectchooser/effectChooserStore';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { toolTip } from '../../utils/passiveToolTipStore';
  import Popup from '../../utils/Popup.svelte';
  import MediaFrame from '../../gallery/MediaFrame.svelte';
  import FilmProceduralControls from './FilmProceduralControls.svelte';
  import BarrierIcon from './BarrierIcon.svelte';
  import { saveAs } from 'file-saver';
  import { canvasToBlob } from '../../lib/layeredCanvas/tools/imageUtil';
  import type { FilmTool } from '../../utils/filmTools';
  import { _ } from 'svelte-i18n';

  import visibleIcon from '../../assets/filmlist/eye.webp';
  import trashIcon from '../../assets/filmlist/trash.webp';
  import punchIcon from '../../assets/filmlist/punch.webp';
  import outPaintingIcon from '../../assets/filmlist/outpainting.webp';
  import popupIcon from '../../assets/filmlist/popup.webp';
  import videoIcon from '../../assets/video.webp';
  import upscaleIcon from '../../assets/filmlist/upscale.webp';
  import dupliateIcon from '../../assets/filmlist/duplicate.webp';
  import eraserIcon from '../../assets/filmlist/eraser.webp';
  import inpaintIcon from '../../assets/filmlist/inpaint.webp';
  import texteditIcon from '../../assets/filmlist/textedit.webp';
  import angleeditIcon from '../../assets/filmlist/angleedit.webp';
  import downloadIcon from '../../assets/download.webp';
  import textLiftIcon from '../../assets/filmlist/textlift.webp';
  import layerizeIcon from '../../assets/filmlist/layerize.webp';
  import stampIcon from '../../assets/stamp.webp';
  import { drawProceduralEffect } from '../../lib/layeredCanvas/tools/draw/proceduralEffectRenderer';
  import { tick } from 'svelte';
  
  export let showsBarrier: boolean;
  export let film: Film | null;
  export let calculateOutPaintingCost: ((film: Film) => number) | null = null;
  export let calculateInPaintingCost: ((film: Film) => number) | null = null;
  export let downloadName: string = '';

  let effectVisible = false;
  let outPaintingCost = 0;
  let inPaintingCost = 0;
  let popupVisible = false;
  let popupButton: HTMLButtonElement;

  $: filmMedia = film && film.content.kind === 'media' ? film.content.media : null;

  type ProceduralFilm = Film & { content: Extract<FilmContent, { kind: 'procedural' }> };

  let proceduralFilm: ProceduralFilm | null = null;

  $: proceduralFilm = film && film.content.kind === 'procedural'
    ? (film as ProceduralFilm)
    : null;

  // barrier用Popupの状態管理
  let barrierPopupVisible = false;
  let barrierPopupTarget: HTMLDivElement | null = null;
  
  const dispatch = createEventDispatcher();

  let proceduralVersion = 0;
  let proceduralCanvas: HTMLCanvasElement | null = null;
  const PROCEDURAL_PREVIEW_FALLBACK = 128;
  const PROCEDURAL_PREVIEW_MIN = 64;

  async function updateProceduralPreview() {
    if (!proceduralFilm) { return; }
    await tick();
    if (!proceduralCanvas) { return; }
    const ctx = proceduralCanvas.getContext('2d');
    if (!ctx) { return; }

    const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio ?? 1 : 1;
    const container = proceduralCanvas.parentElement as HTMLElement | null;
    const containerRect = container?.getBoundingClientRect();
    const availableSize = containerRect && (containerRect.width || containerRect.height)
      ? Math.min(containerRect.width || PROCEDURAL_PREVIEW_FALLBACK, containerRect.height || containerRect.width || PROCEDURAL_PREVIEW_FALLBACK)
      : PROCEDURAL_PREVIEW_FALLBACK;
    const cssSize = Math.max(PROCEDURAL_PREVIEW_MIN, Math.round(availableSize));
    const pixelSize = Math.max(1, Math.round(cssSize * devicePixelRatio));

    if (proceduralCanvas.width !== pixelSize || proceduralCanvas.height !== pixelSize) {
      proceduralCanvas.width = pixelSize;
      proceduralCanvas.height = pixelSize;
    }
    proceduralCanvas.style.width = `${cssSize}px`;
    proceduralCanvas.style.height = `${cssSize}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, proceduralCanvas.width, proceduralCanvas.height);
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    // プレビュー用にfocalPointとfocalRangeを中央にリセット
    const previewEffect = { ...proceduralFilm.content.effect };
    if (previewEffect.type === 'motion-lines') {
      previewEffect.params = {
        ...previewEffect.params,
        focalPoint: [0, 0],
        focalRange: [0, cssSize * 0.25]
      };
    }
    drawProceduralEffect(previewEffect, ctx, cssSize);
  }

  $: if (proceduralFilm && proceduralVersion >= 0) {
      updateProceduralPreview();
    }

  function onClick(e: MouseEvent) {
    dispatch('select', { film, ctrlKey: e.ctrlKey, metaKey: e.metaKey });
  }

  function onDelete(ev: MouseEvent) {
    ev.stopPropagation();
    ev.preventDefault();
    dispatch('delete', film);
  }

  function onToggleVisible(ev: MouseEvent) {
    ev.stopPropagation();
    ev.preventDefault();
    film!.visible = !film!.visible;
    $redrawToken = true;
  }

  function dispatchFilmTool(tool: FilmTool) {
    console.log("filmtool", tool);
    popupVisible = false;
    dispatch('tool', {film, tool});
  }

  function onEraser(ev: MouseEvent) {
    dispatchFilmTool('eraser');
  }

  function onInpaint(ev: MouseEvent) {
    dispatchFilmTool('inpaint');
  }

  function onTextEdit(ev: MouseEvent) {
    dispatchFilmTool('textedit');
  }

  function onAngleEdit(ev: MouseEvent) {
    dispatchFilmTool('angleedit');
  }

  function onSendToMaterialCollection(ev: MouseEvent) {
    dispatchFilmTool('sendToMaterialCollection');
  }

  function onPunch(ev: MouseEvent) {
    dispatchFilmTool('punch');
  }

  function onUpscale(ev: MouseEvent) {
    dispatchFilmTool('upscale');
  }

  function onDuplicate(ev: MouseEvent) {
    dispatchFilmTool('duplicate');
  }

  function onLayerize(ev: MouseEvent) {
    dispatchFilmTool('layerize');
  }

  function onMangaLayerize(ev: MouseEvent) {
    dispatchFilmTool('manga-layerize');
  }

  function onOutPainting(ev: MouseEvent) {
    if (outPaintingCost === 0) {
      toastStore.trigger({ message: "アウトペインティング余地がありません", timeout: 3000 });
      return;
    }
    dispatchFilmTool('outpaint');
  }

  function onVideo(ev: MouseEvent) {
    dispatchFilmTool('video');
  }

  function onTextLift(ev: MouseEvent) {
    dispatchFilmTool('textlift')
  }

  function onToggleeffectVisible(ev: MouseEvent) {
    ev.stopPropagation();
    ev.preventDefault();
    effectVisible = !effectVisible;
  }

  function onProceduralEffectChange() {
    if (!film) { return; }
    proceduralVersion += 1;
    $redrawToken = true;
    dispatch('commit', false);
  }

  function onNewEffect() {
    console.log("onNewEffect");
    $effectChoiceNotifier = (tag: string | null) => {
      switch (tag) {
        case "OutlineEffect":
          film!.effects.push(new OutlineEffect("#000000", 0.01, 0.8));
          dispatch('commit', true);
          break;
      }
      film!.effects = film!.effects;
      filmProcessorQueue.publish({ film: film! });
    };
  }

  function onUpdateEffectList(e: {oldIndex: number | undefined, newIndex:number | undefined}) {
    console.log("onUpdate", e.oldIndex, e.newIndex);
    moveInArray(film!.effects, e.oldIndex!, e.newIndex!);
    console.log("--- onUpdateEffect ---");
    dispatch('commit', true);
  }

  function onDeleteEffect(index: number) {
    console.log("onDeleteEffect", index);
    film!.effects.splice(index, 1);
    film!.effects = film!.effects;
    filmProcessorQueue.publish({ film: film! });
    console.log("--- onDeleteEffect ---");
    dispatch('commit', true);
  }

  function onUpdateEffect(e: CustomEvent<Effect>) {
    let flag = false;
    for (const effect of film!.effects) {
      if (effect.ulid === e.detail.ulid) {
        flag = true;
      }
      if (flag) {
        effect.setOutputDirty();
        filmProcessorQueue.publish({ film: film! });
      }
    }
    dispatch('commit', false);
  }

  function togglePopup(ev: MouseEvent) {
      popupVisible = !popupVisible;
      ev.stopPropagation();
      ev.preventDefault();
  }
  
  function toggleBarrierPopup(e: CustomEvent) {
      barrierPopupVisible = !barrierPopupVisible;
      e.stopPropagation?.();
      e.preventDefault?.();
  }

  $: outPaintingCost = film && film.content.kind === 'media' && calculateOutPaintingCost
    ? calculateOutPaintingCost(film)
    : 0;

  $: inPaintingCost = film && film.content.kind === 'media' && calculateInPaintingCost
    ? calculateInPaintingCost(film)
    : 0;

  // ダウンロードボタンの処理
  async function onDownload(ev: MouseEvent) {
    console.log("onDownload");
    ev.stopPropagation();
    ev.preventDefault();
    if (!film || !filmMedia) {
      toastStore.trigger({ message: $_('frame.errors.noDownloadableImage'), timeout: 2000 });
      return;
    }

    const mediaResource = filmMedia.persistentSource;

    // 画像データ取得
    const baseName = downloadName || 'layer';
    if (mediaResource instanceof HTMLCanvasElement) {
      const blob = await canvasToBlob(mediaResource, "image/png");
      saveAs(blob, `${baseName}.png`);
    } else if (mediaResource instanceof HTMLVideoElement) {
      const blob = await fetch(mediaResource.src).then(res => res.blob());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

</script>


<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="film" draggable={false}>
  {#if !film}
    <div class="w-full h-full variant-soft-tertiary" on:click={onClick}>
      <div class="new-film" use:toolTip={$_('frame.actions.newImage')}>
        ＋
      </div>
    </div>
  {:else if proceduralFilm}
    <div
      class="image-panel procedural"
      class:variant-filled-primary={film.selected}
      class:variant-soft-tertiary={!film.selected}
      on:click={onClick}
    >
      <div class="media-container">
        <canvas bind:this={proceduralCanvas} class="procedural-preview" aria-hidden="true"></canvas>
      </div>
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img draggable={false} class="trash-icon" src={trashIcon} alt={$_('frame.actions.delete')} use:toolTip={$_('frame.actions.delete')} on:click={onDelete} />
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img draggable={false} class="visible-icon" class:off={!film.visible} src={visibleIcon} alt={$_('frame.actions.visibilityToggle')} use:toolTip={$_('frame.actions.visibilityToggle')} on:click={onToggleVisible} />
      {#if showsBarrier}
        <div
          class="barrier-icon"
          bind:this={barrierPopupTarget}
          style="position:absolute; left:40px; top:4px; width:32px; height:32px; z-index:2; cursor:pointer;"
        >
          <BarrierIcon
            barriers={film?.barriers ?? { left: false, right: false, top: false, bottom: false }}
            toolTipText={$_('frame.barrier.opening')}
            on:click={toggleBarrierPopup}
          />
        </div>
      {/if}
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <button
        class="effect-icon"
        class:active={effectVisible}
        aria-label={$_('frame.procedural.settings')}
        use:toolTip={$_('frame.procedural.settings')}
        on:click={onToggleeffectVisible}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 5 8 L 10 13 L 15 8"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
    {#if effectVisible}
      <div class="effect-panel">
        <div class="effect-item variant-ghost-primary procedural-effect-item">
          <FilmProceduralControls film={proceduralFilm} on:change={onProceduralEffectChange} />
        </div>
      </div>
    {/if}
  {:else}
    <div
      class="image-panel"
      class:variant-filled-primary={film.selected}
      class:variant-soft-tertiary={!film.selected}
      on:click={onClick}
    >
      <div class="media-container">
        {#if filmMedia}
          <MediaFrame media={filmMedia} showControls={false} dragAsImage={false} />
        {/if}
      </div>
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img draggable={false} class="trash-icon" src={trashIcon} alt={$_('frame.actions.delete')} use:toolTip={$_('frame.actions.delete')} on:click={onDelete} />
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img draggable={false} class="visible-icon" class:off={!film.visible} src={visibleIcon} alt={$_('frame.actions.visibilityToggle')} use:toolTip={$_('frame.actions.visibilityToggle')} on:click={onToggleVisible} />
      {#if showsBarrier}
        <div
          class="barrier-icon"
          bind:this={barrierPopupTarget}
          style="position:absolute; left:40px; top:4px; width:32px; height:32px; z-index:2; cursor:pointer;"
        >
          <BarrierIcon
            barriers={film?.barriers ?? { left: false, right: false, top: false, bottom: false }}
            toolTipText={$_('frame.barrier.opening')}
            on:click={toggleBarrierPopup}
          />
        </div>
      {/if}
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <button
        class="effect-icon"
        class:active={effectVisible}
        aria-label={$_('frame.actions.effects')}
        use:toolTip={$_('frame.actions.effects')}
        on:click={onToggleeffectVisible}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 5 8 L 10 13 L 15 8"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"/>
        </svg>
      </button>

      <button class="transformix-icon" bind:this={popupButton} on:click={togglePopup}>
        <img draggable={false} src={popupIcon} alt="変換メニュー" />
      </button>
    </div>
    {#if effectVisible}
      <div class="effect-panel">
        <div class="flex flex-col gap-2 w-full" use:sortableList={{ animation: 100, onUpdate: onUpdateEffectList }}>
          {#each film.effects as effect, index (effect.ulid)}
            <div class="effect-item variant-ghost-primary p-2">
              <FilmEffect effect={effect} on:delete={() => onDeleteEffect(index)} on:update={onUpdateEffect} />
            </div>
          {/each}
        </div>
        <div class="effect-item variant-ghost-primary mt-1 flex flex-col items-center text-4xl" on:click={onNewEffect} use:toolTip={$_('frame.actions.addEffect')}>
          +
        </div>
      </div>
    {/if}
  {/if}
</div>

{#if filmMedia}
  <Popup
    show={popupVisible}
    target={popupButton}
    on:close={() => popupVisible = false}>
    <div class="card p-4 shadow-xl z-[1001]" style="z-index: 100;">
      <div class="barrier-transformix-row">
        <div class="transformix-grid">
          {#if calculateOutPaintingCost != null}
            <button class="transformix-item" use:toolTip={outPaintingCost == 0 ? `${$_('frame.actions.outpaint')}(余地がないので不可)` : `${$_('frame.actions.outpaint')}[${outPaintingCost}]`} on:click={onOutPainting}>
              <img draggable={false} src={outPaintingIcon} alt={$_('frame.actions.outpaint')}/>
            </button>
          {/if}
          <button class="transformix-item" use:toolTip={`${$_('frame.actions.eraser')}[6]`} on:click={onEraser}>
            <img draggable={false} src={eraserIcon} alt={$_('frame.actions.eraser')}/>
          </button>
          <button class="transformix-item" use:toolTip={`${$_('frame.actions.backgroundRemoval')}[3]`} on:click={onPunch}>
            <img draggable={false} src={punchIcon} alt={$_('frame.actions.backgroundRemoval')}/>
          </button>
          <button class="transformix-item" use:toolTip={`${$_('frame.actions.upscale')}[1]`} on:click={onUpscale}>
            <img draggable={false} src={upscaleIcon} alt={$_('frame.actions.upscale')}/>
          </button>
          <button class="transformix-item" use:toolTip={`${$_('frame.actions.inpaint')}[${inPaintingCost}]`} on:click={onInpaint}>
            <img draggable={false} src={inpaintIcon} alt={$_('frame.actions.inpaint')}/>
          </button>
          <button class="transformix-item" use:toolTip={`${$_('frame.actions.textEdit')}[6]`} on:click={onTextEdit}>
            <img draggable={false} src={texteditIcon} alt={$_('frame.actions.textEdit')}/>
          </button>
          <button class="transformix-item" use:toolTip={`${$_('frame.actions.angleEdit')}[5]`} on:click={onAngleEdit}>
            <img draggable={false} src={angleeditIcon} alt={$_('frame.actions.angleEdit')}/>
          </button>
          <button class="transformix-item" use:toolTip={$_('frame.actions.duplicate')} on:click={onDuplicate}>
            <img draggable={false} src={dupliateIcon} alt={$_('frame.actions.duplicate')}/>
          </button>
          <button class="transformix-item" use:toolTip={`${$_('frame.actions.movieCreation')}...`} on:click={onVideo}>
            <img draggable={false} src={videoIcon} alt={$_('frame.actions.movieCreation')}/>
          </button>
          <button class="transformix-item" use:toolTip={$_('frame.actions.sendToMaterialCollection')} on:click={onSendToMaterialCollection}>
            <img draggable={false} src={stampIcon} alt={$_('frame.actions.sendToMaterialCollection')}/>
          </button>
          <button class="transformix-item" use:toolTip={$_('frame.actions.textlift')} on:click={onTextLift}>
            <img draggable={false} src={textLiftIcon} alt={$_('frame.actions.textlift')}/>
          </button>
          <button class="transformix-item" use:toolTip={`${$_('frame.actions.layerize')}[8]`} on:click={onLayerize}>
            <img draggable={false} src={layerizeIcon} alt={$_('frame.actions.layerize')}/>
          </button>
          <button class="transformix-item" use:toolTip={'ページレイヤー化 (キャラ別レイヤーに分解して新規ページに挿入)'} on:click={onMangaLayerize}>
            <img draggable={false} src={layerizeIcon} alt="ページレイヤー化"/>
          </button>
          <button class="transformix-item" use:toolTip={$_('frame.actions.download')} on:click={onDownload}>
            <img draggable={false} src={downloadIcon} alt={$_('frame.actions.download')}/>
          </button>
        </div>
      </div>
    </div>
  </Popup>
{/if}

<!-- barrier用Popup -->
{#if barrierPopupVisible && barrierPopupTarget}
<Popup
  show={barrierPopupVisible}
  target={barrierPopupTarget}
  on:close={() => barrierPopupVisible = false}>
  <div class="card p-4 shadow-xl z-[1001]" style="z-index: 100;">
    <div class="barrier-toggle-area">
      <div class="barrier-title">{$_('frame.barrier.opening')}</div>
      <div class="barrier-toggle-layout">
        <button
          class="barrier-toggle barrier-left"
          class:on={film?.barriers.left}
          class:off={!film?.barriers.left}
          use:toolTip={$_('frame.barrier.left')}
          on:click={() => { if (film) { film.barriers.left = !film.barriers.left; $redrawToken = true; dispatch('commit', true); } }}
        >←</button>
        <div class="barrier-updown-group">
          <button
            class="barrier-toggle barrier-top"
            class:on={film?.barriers.top}
            class:off={!film?.barriers.top}
            use:toolTip={$_('frame.barrier.top')}
            on:click={() => { if (film) { film.barriers.top = !film.barriers.top; $redrawToken = true; dispatch('commit', true); } }}
          >↑</button>
          <button
            class="barrier-toggle barrier-bottom"
            class:on={film?.barriers.bottom}
            class:off={!film?.barriers.bottom}
            use:toolTip={$_('frame.barrier.bottom')}
            on:click={() => { if (film) { film.barriers.bottom = !film.barriers.bottom; $redrawToken = true; dispatch('commit', true); } }}
          >↓</button>
        </div>
        <button
          class="barrier-toggle barrier-right"
          class:on={film?.barriers.right}
          class:off={!film?.barriers.right}
          use:toolTip={$_('frame.barrier.right')}
          on:click={() => { if (film) { film.barriers.right = !film.barriers.right; $redrawToken = true; dispatch('commit', true); } }}
        >→</button>
      </div>
    </div>
  </div>
</Popup>
{/if}

<style lang="postcss">
  .film {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .barrier-icon {
    position: absolute;
    left: 40px;
    top: 4px;
    width: 32px;
    height: 32px;
    z-index: 2;
    cursor: pointer;
    /* 仮のデザイン。必要に応じて調整可 */
    filter: opacity(0.7);
  }
  .barrier-transformix-row {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 16px;
  }
  .barrier-toggle-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-right: 8px;
    min-width: 70px;
  }
  .barrier-title {
    font-size: 13px;
    font-weight: bold;
    color: #333;
    margin-bottom: 4px;
    letter-spacing: 0.1em;
    text-align: center;
    opacity: 0.8;
  }
  .barrier-toggle-layout {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 4px;
    margin-right: 0;
  }
  .barrier-updown-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .barrier-toggle {
    width: 28px;
    height: 28px;
    font-size: 18px;
    border-radius: 6px;
    border: 1.5px solid #888;
    background: #eee;
    color: #333;
    cursor: pointer;
    opacity: 0.5;
    transition: background 0.2s, opacity 0.2s;
    margin-bottom: 2px;
    padding: 0;
    outline: none;
  }
  .barrier-toggle.on {
    background: #1976d2;
    color: #fff;
    opacity: 1;
    border-color: #1976d2;
  }
  .barrier-toggle.off {
    background: #fff !important;
    color: #bbb;
    opacity: 1;
    border-color: #ddd;
    box-shadow: 0 0 0 1.5px #eee;
  }
  .barrier-toggle:active {
    filter: brightness(0.9);
  }
  .image-panel {
    width: 100%;
    height: 100px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8px;
    position: relative;
  }
  .media-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .image-panel.procedural .media-container {
    background-color: transparent;
  }
  .procedural-preview {
    display: block;
    width: 100%;
    height: 100%;
  }
  .effect-panel {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    position: relative;
    padding: 8px;
    padding-left: 64px;
  }
  .effect-item {
    width: 100%;
  }
  .procedural-effect-item {
    padding: 0.5rem;
  }
  .procedural-effect-item :global(.procedural-controls) {
    width: 100%;
    gap: 8px;
  }
  .new-film {
    font-size: 60px;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 60px;
    color: black;
  }
  .trash-icon {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 32px;
    height: 32px;
  }
  .visible-icon {
    position: absolute;
    left: 4px;
    top: 4px;
    width: 32px;
    height: 32px;
  }
  .visible-icon.off {
    filter: opacity(0.3);
  }
  .effect-icon {
    position: absolute;
    left: 4px;
    bottom: 4px;
    width: 32px;
    height: 32px;
    border-radius: 4px;
    padding: 0;
    background-color: transparent;
    border: 1.5px solid #999;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
  }
  .effect-icon:hover {
    background-color: rgba(240, 240, 255, 0.5);
    border-color: #666;
    color: #333;
  }
  .effect-icon.active {
    background-color: rgba(100, 100, 255, 0.15);
    border-color: #4444ff;
    color: #4444ff;
  }
  .effect-icon.active:hover {
    background-color: rgba(100, 100, 255, 0.25);
    border-color: #3333ff;
    color: #3333ff;
  }
  .effect-icon svg {
    transition: transform 0.2s ease;
  }
  .effect-icon.active svg {
    transform: rotate(180deg);
  }
  .transformix-icon {
    position: absolute;
    right: 4px;
    bottom: 4px;
    width: 32px;
    height: 32px;
  }
  .transformix-item {
    width: 32px;
    height: 32px;
  }
  .transformix-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    padding: 4px;
  }
</style>
