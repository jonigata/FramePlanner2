<script lang="ts">
  import SpreadCanvas from './SpreadCanvas.svelte';
  import SeekBar from './SeekBar.svelte';
  import { buildBookRenderer, type DisplayProgramEntry } from './buildProgram';
  import { onDestroy, onMount, tick } from 'svelte';
  import { buildTimeTable, renderAtTime, type TimeTableEntry } from './renderProgram';
  import playIcon from '../assets/videomaker/play.png';
  import pauseIcon from '../assets/videomaker/pause.png';
  import Spreader from '../utils/Spreader.svelte'
  import type { Book, VideoSettings } from '../bookeditor/book';

  export let video: VideoSettings;
  export let book: Book;
  export let program: DisplayProgramEntry[]

  let canvas = null;
  let layeredCanvas = null;
  let arrayLayer = null;

  let timeTable: TimeTableEntry[] = [];
  let totalTime: number = 0;
  let cursor = 0;

  $: if (canvas != null) { onRebuild(); }
  function onRebuild() {
    ({arrayLayer, layeredCanvas} = buildBookRenderer(canvas, book));
    layeredCanvas.render();
  }

  $: if (program != null) {
    ({timeTable, totalTime} = buildTimeTable(program, video.moveDuration, video.standardWait));
  }

  $: if (video.standardScale) {
    render();
  }

  let rendering = false;
  async function render() {
    await tick();
    if (rendering) { return; }
    rendering = true;
    console.log("render time: ", cursor);
    await renderAtTime(
      layeredCanvas,
      arrayLayer,
      timeTable,
      cursor,
      video.moveDuration,
      video.standardWait,
      video.standardScale);
    rendering = false;
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

  $: if (0 < timeTable.length && 0 <= cursor && layeredCanvas != null) {
    render();
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

<Spreader>
  <div class="canvas-panel">
    <div class="canvas-container">
      <SpreadCanvas bind:canvas={canvas} bind:width={video.width} bind:height={video.height}/>
    </div>
    <div class="seekbar-container">
      <button type="button" class="btn-icon btn-icon-sm variant-filled" on:click={togglePlay}>
        {#if playing}
          <img class="title-image" src={pauseIcon} alt="pause"/>
        {:else}
          <img class="title-image" src={playIcon} alt="play"/>
        {/if}
      </button>
      <SeekBar bind:program={program} bind:standardWait={video.standardWait} bind:moveDuration={video.moveDuration} bind:cursor={cursor}/>
    </div>
  </div>
</Spreader>

<style>
  .canvas-panel {
    width: 100%;
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