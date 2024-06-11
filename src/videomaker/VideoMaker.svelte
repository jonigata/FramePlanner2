<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import NumberEdit from '../utils/NumberEdit.svelte';
  import FrameResidenceTime from './FrameResidenceTime.svelte';
  import '../box.css';
  import { onMount } from 'svelte';
  import VideoPlayer from './VideoPlayer.svelte';
  import { makeDisplayProgram, type DisplayProgramEntry } from './renderBook';
  import { mainBook } from '../bookeditor/bookStore';
  import Parameter from './Parameter.svelte';
  import { buildMovie } from './buildMovie';
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import { toastStore } from '@skeletonlabs/skeleton';

  let width = 1920;
  let height = 1080;
  let moveDuration = 0.3;
  let standardWait = 1;

  let program: DisplayProgramEntry[] = null;
  let chunkedProgram: DisplayProgramEntry[][] = [];

  function onWaitChanged(e) {
    console.log(program.map(e => e.residenceTime));
    program = program;
  }

  let building = false;
  async function doBuildMovie() {
    building = true;
    try {
      const url = await buildMovie(program, width, height, moveDuration, standardWait, $mainBook);
      building = false;
      toastStore.trigger({ message: 'エンコードに成功しました', timeout: 3000});
      download(url);
    }
    catch (e) {
      console.error(e);
      toastStore.trigger({ message: 'エンコードに失敗しました', timeout: 3000});
    }
    building = false;
  }

  function download(url: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function makeEven(n: number) {
    console.log(n);
    return Math.floor(n / 2) * 2;
  }

  onMount(() => {
    console.log([...$mainBook.pages[0].bubbles]);
    program = makeDisplayProgram($mainBook, [width, height]);
    console.log([...$mainBook.pages[0].bubbles]);
  });

  $: if (program) {
    chunkedProgram = [];
    for (const e of program) {
      chunkedProgram[e.pageNumber] ??= [];
      chunkedProgram[e.pageNumber].push(e);
    }
  }

</script>

<div class="page-container">
  <div class="header-panel variant-filled-surface rounded-container-tokenhbox hbox">
    <div>
      <div class="hbox">
        <div class="font-bold slider-label w-24">Width</div>
        <div style="width: 140px;">
          <RangeSlider bind:value={width} min={512} max={1920} step={2} name="width"/>
        </div>
        <div class="text-xs slider-value-text hbox gap-0.5">
          <div class="number-box"><NumberEdit bind:value={width} min={512} max={1920} on:submit={() => width = makeEven(width)}/></div>
          / {1920}
        </div>
      </div>
      <div class="hbox">
        <div class="font-bold slider-label w-24">Height</div>
        <div style="width: 140px;">
          <RangeSlider bind:value={height} min={512} max={1080} step={2} name="height"/>
        </div>
        <div class="text-xs slider-value-text hbox gap-0.5">
          <div class="number-box"><NumberEdit bind:value={height} min={512} max={1080} on:submit={() => height = makeEven(height)}/></div>
          / {1080}
        </div>
      </div>
    </div>
    <div class="parameter-box">
      <Parameter label="移動時間" bind:value={moveDuration}/>
    </div>
    <div class="parameter-box">
      <Parameter label="標準滞留時間" bind:value={standardWait}/>
    </div>
  </div>

  <div class="contents-panel">
    <div class="player-panel variant-filled-surface rounded-container-token">
      <VideoPlayer bind:width={width} bind:height={height} bind:moveDuration={moveDuration} bind:standardWait={standardWait} bind:program={program}/>
    </div>
    <div class="side-panel vbox gap-4">
      <div class="resindence-times variant-filled-surface rounded-container-token">
        {#each chunkedProgram as pagePrograms, pageNumber}
          <div class="resindence-times-page variant-ghost-secondary rounded-container-token">
            Page {pageNumber+1}
            <div class="indent">
              {#each pagePrograms as program, index}
                <FrameResidenceTime bind:standardWait={standardWait} entry={program} index={index+1} on:waitChanged={onWaitChanged}/>
              {/each}
            </div>
          </div>
        {/each}
      </div>
      <div class="sample-movie variant-filled-surface rounded-container-token">
        {#if building}
          <ProgressRadial width={"w-16"}/>
        {:else}
          <button type="button" class="btn btn-sm variant-filled" on:click={doBuildMovie}>
            ムービー作成
          </button>
        {/if}
      </div>  
    </div>
  </div>

  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <button class="back-button btn variant-filled-secondary px-2 py-2" on:click={() => modalStore.close()}>back</button>
</div>

<style>
  .page-container {
    width: 80dvw;
    height: 90dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .header-panel {
    gap: 12px;
    width: 100%;
  }
  .back-button {
    margin-top: 16px;
    bottom: 8px;
    right: 8px;
    z-index: 1;
    cursor: pointer;
    color: #fff;
    width: 160px;
  }
  .number-box {
    width: 35px;
    height: 20px;
    display: inline-block;
    vertical-align: bottom;
    color: #000;
  }
  .slider-value-text {
    width: 76px;
    text-align: right;
  }
  .contents-panel {
    width: 100%;
    display: flex;
    flex-direction: row;
    flex-grow: 1;
    gap: 16px;
    overflow: hidden; /* こうしないとSpreaderが縮小を通知しない */
  }
  .resindence-times {
    display: flex;
    flex-direction: column;
    width: 100%;
    flex-grow: 1;
    padding: 16px;
    gap: 12px;
    color: #000;
  }
  .resindence-times-page {
    display: flex;
    flex-direction: column;
    padding: 16px;
    align-items: flex-start;
  }
  .indent {
    width: 100%;
    margin-top: 2px;
    margin-left: 8px;
    padding-right: 8px;
  }
  .sample-movie {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 150px;
    padding: 16px;
    gap: 12px;
    color: #000;
  }
  .player-panel {
    flex-grow: 1;
    height: 100%;
    overflow: hidden; /* こうしないとSpreaderが縮小を通知しない */
  }
  .side-panel {
    width: 350px;
  }
</style>