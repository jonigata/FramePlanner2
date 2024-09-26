<script lang="ts">
  import "../box.css"  
  import { FrameElement, collectLeaves, calculatePhysicalLayout, findLayoutOf, constraintLeaf } from '../lib/layeredCanvas/dataModels/frameTree';
  import { Film, FilmStackTransformer } from '../lib/layeredCanvas/dataModels/film';
  import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
  import type { Page } from '../bookeditor/book';
  import { onlineStatus, updateToken } from "../utils/accountStore";
  import Feathral from '../utils/Feathral.svelte';
  import { persistentText } from '../utils/persistentText';
  import { type ImagingContext, generateImage } from '../utils/feathralImaging';
  import { createCanvasFromImage } from '../utils/imageUtil';

  export let imagingContext: ImagingContext;

  let postfix: string = "";

  export async function excecute(page: Page) {
    await generateAll(page);
  }

  async function generate(frame: FrameElement) {
    const result = await generateImage(`${frame.prompt}, ${postfix}`, 1024, 1024, imagingContext);
    if (result != null) {
      await result.images[0].decode();
      const film = new Film();
      const media = new ImageMedia(createCanvasFromImage(result.images[0]));
      film.media = media;
      frame.filmStack.films.push(film);
      frame.gallery.push(media.canvas);
      imagingContext.succeeded++;
    } else {
      imagingContext.failed++;
    }
  }

  async function generateAll(page: Page) {
    imagingContext.awakeWarningToken = true;
    imagingContext.errorToken = true;
    const leaves = collectLeaves(page.frameTree).filter(
      (leaf) => 0 == leaf.filmStack.films.length);
    const promises = [];
    for (const leaf of leaves) {
      promises.push(generate(leaf));
    }
    imagingContext.total = promises.length;
    imagingContext.succeeded = 0;
    imagingContext.failed = 0;
    await Promise.all(promises);

    const pageLayout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
    for (const leaf of leaves) {
      const leafLayout = findLayoutOf(pageLayout, leaf);
      const transformer = new FilmStackTransformer(page.paperSize, leaf.filmStack.films);
      transformer.scale(0.01);
      console.log("scaled");
      constraintLeaf(page.paperSize, leafLayout);
    }
    $updateToken = true;
  }
</script>

<div class="flex flex-col justify-center gap-2">
  <div class="hbox gap-2">
    スタイル
    <textarea class="w-96" bind:value={postfix} use:persistentText={{store:'imaging', key:'style', onLoad: (v) => postfix = v}}/>
  </div>
  {#if $onlineStatus == 'signed-in'}
  <p><Feathral/></p>
  {/if}
</div>

<style>
</style>
