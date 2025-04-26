<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { Film } from "../../lib/layeredCanvas/dataModels/film";
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
  import BarrierIcon from './BarrierIcon.svelte';

  import visibleIcon from '../../assets/filmlist/eye.webp';
  import scribbleIcon from '../../assets/filmlist/scribble.webp';
  import trashIcon from '../../assets/filmlist/trash.webp';
  import punchIcon from '../../assets/filmlist/punch.webp';
  import effectIcon from '../../assets/filmlist/effect.webp';
  import outPaintingIcon from '../../assets/filmlist/outpainting.webp';
  import popupIcon from '../../assets/filmlist/popup.webp';
  import videoIcon from '../../assets/video.webp';
  import upscaleIcon from '../../assets/filmlist/upscale.webp';
  import dupliateIcon from '../../assets/filmlist/duplicate.webp';
  import eraserIcon from '../../assets/filmlist/eraser.webp';
  import inpaintIcon from '../../assets/filmlist/inpaint.webp';
  
  
  export let film: Film | null;
  export let calculateOutPaintingCost: ((film: Film) => number) | null = null;
  export let calculateInPaintingCost: ((film: Film) => number) | null = null;

  let effectVisible = false;
  let outPaintingCost = 0;
  let inPaintingCost = 0;
  let popupVisible = false;
  let popupButton: HTMLButtonElement;
  
  // barrier用Popupの状態管理
  let barrierPopupVisible = false;
  let barrierPopupTarget: HTMLDivElement | null = null;
  
  const dispatch = createEventDispatcher();

  function onClick(e: MouseEvent) {
    console.log("film scale", film?.n_scale, "film size", film?.media.naturalWidth, film?.media.naturalHeight);
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

  function onEraser(ev: MouseEvent) {
    console.log("onEraser");
    popupVisible = false;
    dispatch('eraser', film)
  }

  function onInpaint(ev: MouseEvent) {
    console.log("onInpaint");
    popupVisible = false;
    dispatch('inpaint', film)
  }

  function onScribble(ev: MouseEvent) {
    console.log("onScribble");
    popupVisible = false;
    dispatch('scribble', film)
  }

  function onPunch(ev: MouseEvent) {
    console.log("onPunch");
    popupVisible = false;
    dispatch('punch', film)
  }

  function onUpscale(ev: MouseEvent) {
    console.log("onUpscale");
    popupVisible = false;
    dispatch('upscale', film)
  }

  function onDuplicate(ev: MouseEvent) {
    console.log("onDuplicate");
    popupVisible = false;
    dispatch('duplicate', film)
  }

  function onOutPainting(ev: MouseEvent) {
    console.log("onOutPainting");
    popupVisible = false;

    if (outPaintingCost === 0) {
      toastStore.trigger({ message: "アウトペインティング余地がありません", timeout: 3000 });
      return;
    }
    dispatch('outpainting', film)
  }

  function onVideo(ev: MouseEvent) {
    console.log("FilmListItem.onVideo");
    popupVisible = false;
    dispatch('video', film)
  }

  function onToggleeffectVisible(ev: MouseEvent) {
    ev.stopPropagation();
    ev.preventDefault();
    effectVisible = !effectVisible;
  }

  function onNewEffect() {
    console.log("onNewEffect");
    $effectChoiceNotifier = (tag: string | null) => {
      switch (tag) {
        case "OutlineEffect":
          film!.effects.push(new OutlineEffect("#000000", 0.01, 0.8));
          break;
      }
      film!.effects = film!.effects;
      filmProcessorQueue.publish(film!);
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
    filmProcessorQueue.publish(film!);
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
        filmProcessorQueue.publish(film!);
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

  onMount(() => {
    if (calculateOutPaintingCost) {
      const source = film?.media.drawSource;
      if (source) {
        outPaintingCost = calculateOutPaintingCost!(film!);
      }
    }
    if (calculateInPaintingCost) {
      const source = film?.media.drawSource;
      if (source) {
        inPaintingCost = calculateInPaintingCost!(film!);
      }
    }
  });

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="film"
  draggable={false}
>
  {#if !film}
    <div class="w-full h-full variant-soft-tertiary" on:click={onClick}>
      <div class="new-film" use:toolTip={"新規画像"} >
        ＋
      </div>
    </div>
  {:else if film.media} <!-- ほぼ確定だけど!が使えずエラーになるため -->
    <div 
      class="image-panel" 
      class:variant-filled-primary={film.selected}
      class:variant-soft-tertiary={!film.selected}
      on:click={onClick}
    >
      <div class="media-container">
          <MediaFrame media={film.media} showControls={false} useCanvas={true}/>
      </div>
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img draggable={false} class="trash-icon" src={trashIcon} alt="削除" use:toolTip={"削除"} on:click={onDelete}/>
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img draggable={false} class="visible-icon" class:off={!film.visible} src={visibleIcon} alt="可視/不可視" use:toolTip={"可視/不可視"} on:click={onToggleVisible}/>
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <div
        class="barrier-icon"
        bind:this={barrierPopupTarget}
        style="position:absolute; left:40px; top:4px; width:32px; height:32px; z-index:2; cursor:pointer;"
      >
        <BarrierIcon
          barriers={film?.barriers ?? { left: false, right: false, top: false, bottom: false }}
          toolTipText="枠の開放"
          on:click={toggleBarrierPopup}
        />
      </div>
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img draggable={false} class="effect-icon" class:active={effectVisible} src={effectIcon} alt="エフェクト" use:toolTip={"エフェクト"} on:click={onToggleeffectVisible}/>

      <button 
        class="transformix-icon"
        bind:this={popupButton}
        on:click={togglePopup}
      >
        <img draggable={false} src={popupIcon} alt="変換メニュー"/>
      </button>
    </div>
    {#if effectVisible}
      <div class="effect-panel">
        <div class="flex flex-col gap-2 w-full" use:sortableList={{animation: 100, onUpdate: onUpdateEffectList}}>
          {#each film.effects as effect, index (effect.ulid)}
            <div class="effect-item variant-ghost-primary p-2">
              <FilmEffect effect={effect} on:delete={() => onDeleteEffect(index)} on:update={onUpdateEffect}/>
            </div>
          {/each}
        </div>
        <!-- centering -->
        <div class="effect-item variant-ghost-primary mt-1 flex flex-col items-center text-4xl" on:click={onNewEffect} use:toolTip={"エフェクト追加"} >
          +
        </div>
      </div>
    {/if}
  {/if}
</div>

<Popup
  show={popupVisible}
  target={popupButton}
  on:close={() => popupVisible = false}>
  <div class="card p-4 shadow-xl z-[1001]" style="z-index: 100;">
    <div class="barrier-transformix-row">
      <div class="transformix-grid">
        {#if calculateOutPaintingCost != null}
          <button class="transformix-item" use:toolTip={outPaintingCost == 0 ? "アウトペインティング(余地がないので不可)" : "アウトペインティング[" + outPaintingCost + "]"} on:click={onOutPainting}>
            <img draggable={false} src={outPaintingIcon} alt="アウトペインティング"/>
          </button>
        {/if}
        <button class="transformix-item" use:toolTip={"消しゴム[6]"} on:click={onEraser}>
          <img draggable={false} src={eraserIcon} alt="消しゴム"/>
        </button>
        <button class="transformix-item" use:toolTip={"背景除去[3]"} on:click={onPunch}>
          <img draggable={false} src={punchIcon} alt="背景除去"/>
        </button>
        <button class="transformix-item" use:toolTip={"アップスケール[1]"} on:click={onUpscale}>
          <img draggable={false} src={upscaleIcon} alt="アップスケール"/>
        </button>
        <button class="transformix-item" use:toolTip={`インペイント[${inPaintingCost}]`} on:click={onInpaint}>
          <img draggable={false} src={inpaintIcon} alt="インペイント"/>
        </button>
        <button class="transformix-item" use:toolTip={"落書き"} on:click={onScribble}>
          <img draggable={false} src={scribbleIcon} alt="落書き"/>
        </button>
        <button class="transformix-item" use:toolTip={"複製"} on:click={onDuplicate}>
          <img draggable={false} src={dupliateIcon} alt="複製"/>
        </button>
        <button class="transformix-item" use:toolTip={"ムービー作成..."} on:click={onVideo}>
          <img draggable={false} src={videoIcon} alt="ムービー作成"/>
        </button>
      </div>
    </div>
  </div>
</Popup>

<!-- barrier用Popup -->
{#if barrierPopupVisible && barrierPopupTarget}
<Popup
  show={barrierPopupVisible}
  target={barrierPopupTarget}
  on:close={() => barrierPopupVisible = false}>
  <div class="card p-4 shadow-xl z-[1001]" style="z-index: 100;">
    <div class="barrier-toggle-area">
      <div class="barrier-title">枠の開放</div>
      <div class="barrier-toggle-layout">
        <button
          class="barrier-toggle barrier-left"
          class:on={film?.barriers.left}
          class:off={!film?.barriers.left}
          use:toolTip={"左枠の開放"}
          on:click={() => { if (film) { film.barriers.left = !film.barriers.left; $redrawToken = true; dispatch('commit', true); } }}
        >←</button>
        <div class="barrier-updown-group">
          <button
            class="barrier-toggle barrier-top"
            class:on={film?.barriers.top}
            class:off={!film?.barriers.top}
            use:toolTip={"上枠の開放"}
            on:click={() => { if (film) { film.barriers.top = !film.barriers.top; $redrawToken = true; dispatch('commit', true); } }}
          >↑</button>
          <button
            class="barrier-toggle barrier-bottom"
            class:on={film?.barriers.bottom}
            class:off={!film?.barriers.bottom}
            use:toolTip={"下枠の開放"}
            on:click={() => { if (film) { film.barriers.bottom = !film.barriers.bottom; $redrawToken = true; dispatch('commit', true); } }}
          >↓</button>
        </div>
        <button
          class="barrier-toggle barrier-right"
          class:on={film?.barriers.right}
          class:off={!film?.barriers.right}
          use:toolTip={"右枠の開放"}
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
    filter: opacity(25%);
  }
  .effect-icon.active {
    filter: opacity(100%);
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