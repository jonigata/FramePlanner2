<script lang="ts">
  import { collectLeaves, calculatePhysicalLayout, findLayoutOf, constraintLeaf, type Layout } from '../lib/layeredCanvas/dataModels/frameTree';
  import { Film, FilmStackTransformer } from '../lib/layeredCanvas/dataModels/film';
  import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
  import type { Page } from '../lib/book/book';
  import { onlineStatus, updateToken } from "../utils/accountStore";
  import Feathral from '../utils/Feathral.svelte';
  import { persistentText } from '../utils/persistentText';
  import { type ImagingContext, type Mode, generateFluxImage } from '../utils/feathralImaging';
  import { createCanvasFromImage } from '../lib/layeredCanvas/tools/imageUtil';
  import { busy, batchImagingPage } from './batchImagingStore';
  import { mainBook, redrawToken } from '../bookeditor/bookStore';
  import { commitBook } from '../lib/book/book';
  import FluxModes from './FluxModes.svelte';
  import "../box.css"  

  export let imagingContext: ImagingContext;

  let postfix: string = "";
  let mode: Mode = "schnell";

  async function execute() {
    console.log('execute');
    $busy = true;
    await generateAll($batchImagingPage!);
    $busy = false;
    console.log('execute done');

    commitBook($mainBook!, null);
    $mainBook = $mainBook;
    $redrawToken = true;
    $batchImagingPage = null;
  }

  async function generate(paperSize: [number, number], leafLayout: Layout) {
    console.log("postfix", postfix);
    const frame = leafLayout.element;
    const result = await generateFluxImage(`${postfix}\n${frame.prompt}`, {width:1024,height:1024}, mode, 1, imagingContext);
    if (result != null) {
      await result.images[0].decode();
      const media = new ImageMedia(createCanvasFromImage(result.images[0]));
      const film = new Film(media);
      frame.filmStack.films.push(film);
      frame.gallery.push(media.canvas);

      const transformer = new FilmStackTransformer(paperSize, frame.filmStack.films);
      transformer.scale(0.01);
      console.log("scaled");
      constraintLeaf(paperSize, leafLayout);
      $redrawToken = true;

      imagingContext.succeeded++;
    } else {
      imagingContext.failed++;
    }
  }

  async function generateAll(page: Page) {
    imagingContext.awakeWarningToken = true;
    imagingContext.errorToken = true;

    const pageLayout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
    const leaves = collectLeaves(page.frameTree).filter(
      (leaf) => 0 == leaf.filmStack.films.length);
    const promises = [];
    for (const leaf of leaves) {
      if (0 < leaf.filmStack.films.length) { continue; }
      const leafLayout = findLayoutOf(pageLayout, leaf);
      promises.push(generate(page.paperSize, leafLayout!));
    }
    imagingContext.total = promises.length;
    imagingContext.succeeded = 0;
    imagingContext.failed = 0;
    await Promise.all(promises);

    $updateToken = true;
  }
</script>

<div class="flex flex-col gap-2 mt-2 w-full h-full">
  {#if $onlineStatus !== 'signed-in'}
    <p>ログインしてください</p>
  {:else}
    <p><Feathral/></p>
    <div class="flex flex-row gap-2 items-center">
      <h3>モード</h3>
      <FluxModes bind:mode={mode} comment={"1コマあたり"}/>
      <h3>スタイル</h3>
      <textarea class="textarea textarea-style w-96" bind:value={postfix} use:persistentText={{store:'imaging', key:'style', onLoad: (v) => postfix = v}}/>
      </div>
    <button class="btn btn-sm variant-filled w-32" disabled={imagingContext.total === imagingContext.succeeded} on:click={execute}>開始</button>
  {/if}
</div>

<style>
  h3 {
    font-family: '源暎エムゴ';
    font-weight: 500;
    font-size: 20px;
  }
  .textarea-style {
    font-size: 16px;
    font-weight: 700;
    font-family: '源暎アンチック';
    border-radius: 2px;
    padding-left: 8px;
    padding-right: 8px;
  }

</style>
