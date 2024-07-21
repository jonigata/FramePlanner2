<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { Film } from "../../lib/layeredCanvas/dataModels/film";
  import { redrawToken } from '../bookStore';
  import FilmEffect from "./FilmEffect.svelte";
  import { SortableList } from '@sonderbase/svelte-sortablejs';
  import { moveInArray } from '../../utils/moveInArray';

  import visibleIcon from '../../assets/filmlist/eye.png';
  import scribbleIcon from '../../assets/filmlist/scribble.png';
  // import generateIcon from '../../assets/filmlist/generate.png';
  import trashIcon from '../../assets/filmlist/trash.png';
  import punchIcon from '../../assets/filmlist/punch.png';
  import effectIcon from '../../assets/filmlist/effect.png';
  import { toolTip } from '../../utils/passiveToolTipStore';

  export let film: Film;

  let imagePanel;
  let imageContainer;
  let image;
  let effectVisible = false;

  const dispatch = createEventDispatcher();

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
    film.visible = !film.visible;
    $redrawToken = true;
  }

  function onScribble(ev: MouseEvent) {
    console.log("onScribble");
    ev.stopPropagation();
    ev.preventDefault();
    dispatch('scribble', film)
  }

  function onGenerate(ev: MouseEvent) {
    // scribble用、今は使ってない
    console.log("onGenerate");
    ev.stopPropagation();
    ev.preventDefault();
    dispatch('generate')
  }

  function onPunch(ev: MouseEvent) {
    console.log("onPunch");
    ev.stopPropagation();
    ev.preventDefault();
    dispatch('punch', film)
  }

  function onToggleeffectVisible(ev: MouseEvent) {
    ev.stopPropagation();
    ev.preventDefault();
    effectVisible = !effectVisible;
  }

  function onLoad(e: Event) {
    adjustContainerSize();
  }

  function adjustContainerSize() {
    // object-fit: containsを使うとサイズを取得できないので、
    // Imgのサイズをobject-fit: contains相当で自前で計算し、
    // filmContainerに設定する
    const aspect = image.naturalWidth / image.naturalHeight;
    const itemAspect = imagePanel.clientWidth / imagePanel.clientHeight;
    if (aspect > itemAspect) {
      imageContainer.style.width = "100%";
      imageContainer.style.height = `calc(100% * ${itemAspect / aspect})`;
    } else {
      imageContainer.style.width = `calc(100% * ${aspect / itemAspect})`;
      imageContainer.style.height = "100%";
    }
    imageContainer.style.display = "block";
  }

  function onNewEffect(e: CustomEvent<{ index: number, files: FileList }>) {

  }

  function onMoveEffect(e: CustomEvent<{ index: number, sourceIndex: number }>) {

  }

  function onUpdateEffect(e: {oldIndex: number, newIndex:number}) {
    console.log("onUpdate", e.oldIndex, e.newIndex);
    moveInArray(film.effects, e.oldIndex, e.newIndex);
    dispatch('commit');
  }

  function onDeleteEffect(index: number) {
    console.log("onDeleteEffect", index);
    film.effects.splice(index, 1);
    film.effects = film.effects;
    dispatch('commit');
  }

  onMount(() => {
    if (image && image.complete) {
      adjustContainerSize();
    }
  });

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="film"
  class:variant-filled-primary={film?.selected}
  class:variant-soft-tertiary={!film?.selected}
  draggable={false}
>
  {#if !film}
    <div class="w-full h-full" on:click={onClick}>
      <div class="new-film"use:toolTip={"新規画像"} >
        ＋
      </div>
    </div>
  {:else}
    <div class="image-panel" bind:this={imagePanel} on:click={onClick}>
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img draggable={false} class="trash-icon" src={trashIcon} alt="削除" use:toolTip={"削除"} on:click={onDelete}/>
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img draggable={false} class="visible-icon" class:off={!film.visible} src={visibleIcon} alt="可視/不可視" use:toolTip={"可視/不可視"} on:click={onToggleVisible}/>
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <!--
      <img draggable={false} class="generate-icon" src={generateIcon} alt="AI生成" use:toolTip={"AI生成"} on:click={onGenerate}/>
      -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img draggable={false} class="effect-icon" class:active={effectVisible} src={effectIcon} alt="エフェクト" use:toolTip={"エフェクト"} on:click={onToggleeffectVisible}/>
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img draggable={false} class="scribble-icon" src={scribbleIcon} alt="落書き" use:toolTip={"落書き"} on:click={onScribble}/>
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img draggable={false} class="punch-icon" src={punchIcon} alt="背景除去" use:toolTip={"背景除去"} on:click={onPunch}/>
      <div class="image-container" bind:this={imageContainer}>
        <img draggable={false} class="film-content" crossorigin="anonymous" src={film.media.drawSource.src} alt="film" bind:this={image} on:load={onLoad}/>
      </div>
    </div>
    {#if effectVisible}
      <div class="effect-panel">
        <SortableList class="flex flex-col gap-2 w-full" animation={100} onUpdate={onUpdateEffect}>
          {#each film.effects as effect, index}
            <div class="effect-item variant-ghost-primary p-2">
              <FilmEffect effect={effect} on:delete={() => onDeleteEffect(index)}/>
            </div>
          {/each}
        </SortableList>
        <!-- centering -->
        <div class="effect-item variant-ghost-primary mt-1 flex flex-col items-center text-4xl">+</div>
      </div>
    {/if}
  {/if}
</div>

<style lang="postcss">
  .film {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
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
  .image-container {
    position: relative;
    display: none;
    width: 100px;
    height: 100px;
    background-image: linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc),
                      linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
    background-color: white;
  }
  .film-content {
    position: absolute;
    width: 100%;
    height: 100%;
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
  .scribble-icon {
    position: absolute;
    right: 40px;
    bottom: 4px;
    width: 32px;
    height: 32px;
  }
  .punch-icon {
    position: absolute;
    right: 4px;
    bottom: 4px;
    width: 32px;
    height: 32px;
  }
</style>