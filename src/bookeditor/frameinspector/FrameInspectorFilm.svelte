<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { Film } from "../../lib/layeredCanvas/dataModels/frameTree";
  import { redrawToken } from '../bookStore';
  import visibleIcon from '../../assets/frameInspector/eye.png';
  import scribbleIcon from '../../assets/frameInspector/scribble.png';
  import generateIcon from '../../assets/frameInspector/generate.png';
  import trashIcon from '../../assets/frameInspector/trash.png';
  import { toolTip } from '../../utils/passiveToolTipStore';

  export let film: Film;

  const dispatch = createEventDispatcher();

  function onClick(e: MouseEvent) {
    dispatch('select', { film, ctrlKey: e.ctrlKey });
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
    console.log("onGenerate");
    ev.stopPropagation();
    ev.preventDefault();
    dispatch('generate', film)
  }

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="film"
  class:selected={film?.selected}
  class:unselected={!film?.selected}
  draggable={false}
  on:click={onClick}>
  {#if !film}
    <div class="vbox">
      <div class="new-film">
        ＋
      </div>
      <div class="new-film-description">
        ここに画像をドロップ
      </div>
    </div>
  {:else}
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <img draggable={false} class="trash-icon" src={trashIcon} alt="削除" use:toolTip={"削除"} on:click={onDelete}/>
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <img draggable={false} class="visible-icon" class:off={!film.visible} src={visibleIcon} alt="可視/不可視" use:toolTip={"可視/不可視"} on:click={onToggleVisible}/>
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <img draggable={false} class="scribble-icon" src={scribbleIcon} alt="落書き" use:toolTip={"落書き"} on:click={onScribble}/>
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <img draggable={false} class="generate-icon" src={generateIcon} alt="AI生成" use:toolTip={"AI生成"} on:click={onGenerate}/>
    <div class="film-container">
      <img draggable={false} class="film-content" src={film.image.src} alt="film"/>
    </div>
    {/if}
</div>

<style lang="postcss">
  .film {
    width: 100%;
    height: 100px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8px;
    position: relative;
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
  .new-film-description {
    color: black;
  }
  .film-container {
    width: 100%;
    height: 100%;
    background-image: linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc),
                      linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
    background-color: white;
  }
  .film-content {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .selected {
    @apply variant-filled-primary;
  }
  .unselected {
    @apply variant-soft-tertiary;
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
  .scribble-icon {
    position: absolute;
    left: 4px;
    bottom: 4px;
    width: 32px;
    height: 32px;
  }
  .generate-icon {
    position: absolute;
    right: 4px;
    bottom: 4px;
    width: 32px;
    height: 32px;
  }
</style>