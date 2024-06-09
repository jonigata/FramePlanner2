<script lang="ts">
  import SpreadCanvas from './SpreadCanvas.svelte';
  import SeekBar from './SeekBar.svelte';
  import { buildBookRenderer, type DisplayProgramEntry } from './renderBook';
  import { mainBook } from '../bookeditor/bookStore';
  import { onDestroy, onMount } from 'svelte';
  import { createTimeTable, renderAtTime, type PlayerEntry } from './videoPlayer';
  import playIcon from '../assets/videomaker/play.png';
  import pauseIcon from '../assets/videomaker/pause.png';

  export let width: number;
  export let height: number;
  export let moveDuration: number;
  export let standardWait: number;
  export let program: DisplayProgramEntry[]

  let canvas = null;
  let layeredCanvas = null;
  let arrayLayer = null;

  let timeTable: PlayerEntry[] = [];
  let totalTime: number = 0;
  let cursor = 0;

  $: if (canvas != null) { onRebuild(); }
  function onRebuild() {
    ({arrayLayer, layeredCanvas} = buildBookRenderer(canvas, $mainBook));
    layeredCanvas.render();
  }

  $: if (program != null) {
    ({timeTable, totalTime} = createTimeTable(program, moveDuration, standardWait));
  }

  function render(_c: number) {
    renderAtTime(
      (index: number, normalizedTime: number) => {
        const v = layeredCanvas.viewport;
        const e0 = timeTable[index].entry;
        const p = arrayLayer.array.childPositionToParentPosition(e0.pageNumber, e0.position);
        const currScale = e0.scale * 0.98;
        const currTranslate = [-p[0] * currScale, -p[1] * currScale];
        if (normalizedTime == 0 || index == timeTable.length - 1) {
          v.translate = currTranslate;
          v.scale = currScale;
        } else {
          const e1 = timeTable[index + 1].entry;
          const p1 = arrayLayer.array.childPositionToParentPosition(e1.pageNumber, e1.position);
          const nextScale = e1.scale * 0.98;
          const nextTranslate = [-p1[0] * nextScale, -p1[1] * nextScale];
          const [dx, dy] = [nextTranslate[0] - currTranslate[0], nextTranslate[1] - currTranslate[1]];
          v.translate = [currTranslate[0] + dx * normalizedTime, currTranslate[1] + dy * normalizedTime];
          v.scale = currScale + (nextScale - currScale) * normalizedTime;
        }
        v.dirty = true;
        layeredCanvas.render();
      },
      timeTable,
      cursor,
      moveDuration,
      standardWait);
  }

  let playerAlive = true;
  let playing = false;
  async function play() {
    while (playerAlive) {
      const now = performance.now();
      await new Promise(resolve => requestAnimationFrame(resolve));
      const elapsed = performance.now() - now;
      if (playing) {
        cursor += elapsed / 1000;
        if (cursor > totalTime) {
          cursor = 0;
        }
      }
    }
    console.log("play done");
  }

  $: if (0 < timeTable.length) {
    render(cursor);
  }

  onMount(() => {
    play();
  });

  onDestroy(() => {
    playerAlive = false;
  });

  function togglePlay() {
    playing = !playing;
  }

</script>

<div class="canvas-panel variant-filled-surface rounded-container-token">
  <div class="canvas-container">
    <SpreadCanvas bind:canvas={canvas} bind:width={width} bind:height={height}/>
  </div>
  <div class="seekbar-container">
    <button type="button" class="btn-icon btn-icon-sm variant-filled" on:click={togglePlay}>
      {#if playing}
        <img class="title-image" src={pauseIcon} alt="pause"/>
      {:else}
        <img class="title-image" src={playIcon} alt="play"/>
      {/if}
    </button>
    <SeekBar bind:program={program} bind:standardWait={standardWait} bind:moveDuration={moveDuration} bind:cursor={cursor}/>
  </div>
</div>

<style>
  .canvas-panel {
    width: 70%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .canvas-container {
    width: 100%;
    flex-grow: 1;
  }
  .seekbar-container {
    width: 100%;
    height: 24px;
    display: flex;
  }
</style>