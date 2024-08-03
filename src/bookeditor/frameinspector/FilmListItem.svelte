<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Film } from "../../lib/layeredCanvas/dataModels/film";
  import { Effect, OutlineEffect } from "../../lib/layeredCanvas/dataModels/effect";
  import { redrawToken } from '../bookStore';
  import FilmEffect from "./FilmEffect.svelte";
  import { moveInArray } from '../../utils/moveInArray';
  import { sortableList } from '../../utils/sortableList'
  import { effectProcessorQueue } from '../../utils/effectprocessor/effectProcessorStore';
  import SpreadCanvas from '../../utils/SpreadCanvas.svelte';
  import { effectChoiceNotifier } from '../effectchooser/effectChooserStore';

  import visibleIcon from '../../assets/filmlist/eye.png';
  import scribbleIcon from '../../assets/filmlist/scribble.png';
  // import generateIcon from '../../assets/filmlist/generate.png';
  import trashIcon from '../../assets/filmlist/trash.png';
  import punchIcon from '../../assets/filmlist/punch.png';
  import effectIcon from '../../assets/filmlist/effect.png';
  import { toolTip } from '../../utils/passiveToolTipStore';

  export let film: Film;

  let canvas: HTMLCanvasElement;
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

  function onNewEffect() {
    console.log("onNewEffect");
    $effectChoiceNotifier = (tag: string) => {
      switch (tag) {
        case "OutlineEffect":
          film.effects.push(new OutlineEffect("#000000", 0.01, 0.8));
          break;
      }
      film.effects = film.effects;
      effectProcessorQueue.publish(film);
    };
  }

  function onUpdateEffectList(e: {oldIndex: number, newIndex:number}) {
    console.log("onUpdate", e.oldIndex, e.newIndex);
    moveInArray(film.effects, e.oldIndex, e.newIndex);
    console.log("--- onUpdateEffect ---");
    dispatch('commit', true);
  }

  function onDeleteEffect(index: number) {
    console.log("onDeleteEffect", index);
    film.effects.splice(index, 1);
    film.effects = film.effects;
    effectProcessorQueue.publish(film);
    console.log("--- onDeleteEffect ---");
    dispatch('commit', true);
  }

  function onUpdateEffect(e: CustomEvent<Effect>) {
    let flag = false;
    for (const effect of film.effects) {
      if (effect.ulid === e.detail.ulid) {
        flag = true;
      }
      if (flag) {
        effect.setOutputDirty();
        effectProcessorQueue.publish(film);
      }
    }
    dispatch('commit', false);
  }

  $: onCanvas(canvas);
  function onCanvas(c: HTMLCanvasElement) {
    if (!c) return;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(film.media.drawSource, 0, 0);
  }

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
  {:else}
    <div 
      class="image-panel" 
      class:variant-filled-primary={film?.selected}
      class:variant-soft-tertiary={!film?.selected}
      on:click={onClick}
    >
      <SpreadCanvas width={film.media.drawSource.width} height={film.media.drawSource.height} bind:canvas={canvas}/>
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