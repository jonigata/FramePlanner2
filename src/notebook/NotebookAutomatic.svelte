<script lang="ts">
  import { tick } from 'svelte';
  import { toastStore } from '@skeletonlabs/skeleton';
  import NotebookTextarea from './NotebookTextarea.svelte';
  import { callAdvise } from './callAdvise';
  import { ulid } from 'ulid';
  import Feathral from '../utils/Feathral.svelte';
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import {makePagesFromStoryboard} from './makePage';
  import { bookEditor, mainBook, redrawToken } from '../bookeditor/bookStore'
  import { ImagingContext, generateFluxImage } from '../utils/feathralImaging';
  import { FrameElement, collectLeaves, calculatePhysicalLayout, findLayoutOf, constraintLeaf } from '../lib/layeredCanvas/dataModels/frameTree';
  import type { Page } from '../bookeditor/book';
  import { Film, FilmStackTransformer } from '../lib/layeredCanvas/dataModels/film';
  import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
  import { createCanvasFromImage } from '../utils/imageUtil';
  import { updateToken } from "../utils/accountStore";
  import { persistent } from '../utils/persistent';
  import { ProgressBar } from '@skeletonlabs/skeleton';

  $: notebook = $mainBook ? $mainBook.notebook : null;

  let postfix: string = "";

  let themeProgress = 0;
  let charactersProgress = 0;
  let plotProgress = 0;
  let scenarioProgress = 0;
  let storyboardProgress = 0;
  let imageProgress = 0;
  let imageProgressDenominator = 0;
  let running = false;

  $: onThemeChanged(notebook.theme);
  function onThemeChanged(theme: string) {
    console.log("theme", theme);
    if (!theme) {
      themeProgress = 0;
    } else {
      themeProgress = 1;
    }
  }

  async function onThemeAdvise(e: CustomEvent<string>) {
    themeProgress = 0.5;
    notebook.theme = await callAdvise('theme', notebook);
    themeProgress = 1;
  }

  async function onStart() {
    try {
      running = true;

      if (!notebook.theme) {
        themeProgress = 0.5;
        notebook.theme = await callAdvise('theme', notebook);
        themeProgress = 1;
      }

      notebook.characters = [];
      notebook.plot = '';
      notebook.scenario = '';
      notebook.storyboard = null;

      charactersProgress = 0.5;
      const newCharacters = await callAdvise('characters', notebook);
      newCharacters.forEach(c => c.ulid = ulid());
      notebook.characters = newCharacters;
      charactersProgress = 1;

      plotProgress = 0.5;
      notebook.plot = await callAdvise('plot', notebook);
      plotProgress = 1;

      scenarioProgress = 0.5;
      notebook.scenario = await callAdvise('scenario', notebook);
      scenarioProgress = 1;

      storyboardProgress = 0.5;
      await buildStoryboard();
      storyboardProgress = 1.0;

      imageProgress = 0.001;
      await generateImages();
      imageProgress = 1;
    }
    catch(e) {
      toastStore.trigger({ message: 'AIエラー', timeout: 1500});
      console.error(e);
      charactersProgress = 0;
      plotProgress = 0;
      scenarioProgress = 0;
      storyboardProgress = 0;
      imageProgress = 0;
    }
    running = false;
  }

  // Manualからほぼコピペ
  async function buildStoryboard() {
    console.log('build storyboard');
    try {
      const storyboard = await callAdvise('storyboard', notebook);
      const receivedPages = makePagesFromStoryboard(storyboard);
      let marks = $bookEditor.getMarks();
      const newPages = $mainBook.pages.filter((p, i) => !marks[i]);
      const oldLength = newPages.length;
      newPages.push(...receivedPages);
      $mainBook.pages = newPages;
      $mainBook = $mainBook;

      await tick();
      marks = $bookEditor.getMarks();
      newPages.forEach((p, i) => {
        if (oldLength <= i) marks[i] = true;
      });
      $bookEditor.setMarks(marks);
      $redrawToken = true;
    } catch (e) {
      toastStore.trigger({ message: 'AIエラー', timeout: 1500});
      console.error(e);
    }
  }

  async function generateImages() {
    const marks = $bookEditor.getMarks();
    const newPages = $mainBook.pages.filter((p, i) => marks[i]);

    let sum = 0;
    for (let i = 0; i < newPages.length; i++) {
      const page = newPages[i];      
      const leaves = collectLeaves(page.frameTree);
      sum += leaves.length;
    }
    imageProgressDenominator = sum;

    for (let i = 0; i < newPages.length; i++) {
      const page = newPages[i];
      await generateAll(page);
    }
  }

  // BatchImagingFluxからコピペ
  async function generate(frame: FrameElement) {
    console.log("postfix", postfix);
    const result = await generateFluxImage(`${postfix}\n${frame.prompt}`, "square_hd", false, 1, imagingContext);
    if (result != null) {
      await result.images[0].decode();
      const film = new Film();
      const media = new ImageMedia(createCanvasFromImage(result.images[0]));
      film.media = media;
      frame.filmStack.films.push(film);
      frame.gallery.push(media.canvas);
      imagingContext.succeeded++;
      $redrawToken = true;
    } else {
      imagingContext.failed++;
    }
    imageProgress += 1 / imageProgressDenominator;
  }

  let imagingContext = new ImagingContext();
  async function generateAll(page: Page) {
    imagingContext.reset();
    const leaves = collectLeaves(page.frameTree);
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

<div class="drawer-content">
  <h1>カイルちゃんの創作ノート 全自動版</h1>
  <div class="flex justify-start">
    <Feathral/>
  </div>
  <ul class="list">
    <li class:done={themeProgress == 1}>
      <div class="w-full">
        テーマ
        <div class="w-full pl-4 mb-4 text-black">
          <NotebookTextarea bind:value={notebook.theme} on:advise={onThemeAdvise} waiting={0 < themeProgress && themeProgress < 1} placeholder={"テーマを入力するか、ベルを押してください"}/>
          {#if !running}
            <button class="btn variant-filled-primary" on:click={onStart}>スタート</button>
          {/if}
        </div>
      </div>
    </li>
    <li class:done={charactersProgress == 1} >登場人物
      {#if 0 < charactersProgress && charactersProgress < 1}
        <ProgressRadial width="w-4"/>
      {/if}
    </li>
    <li class:done={plotProgress == 1}>プロット
      {#if 0 < plotProgress && plotProgress < 1}
        <ProgressRadial width="w-4"/>
      {/if}
    </li>
    <li class:done={scenarioProgress == 1}>シナリオ
      {#if 0 < scenarioProgress && scenarioProgress < 1}
        <ProgressRadial width="w-4"/>
      {/if}
    </li>
    <li class:done={storyboardProgress == 1}>ネーム
      {#if 0 < storyboardProgress && storyboardProgress < 1}
        <ProgressRadial width="w-4"/>
      {/if}
    </li>
    <li class:done={imageProgress == 1}>
      <div class="w-full">
        画像
        <div class="w-full pl-4 flex flex-row items-center text-black mb-2">
          <span class="w-24">スタイル</span> <input type="text" class="input image-style pl-4" bind:value={postfix} use:persistent={{db: 'preferences', store:'imaging', key:'style', onLoad: (v) => postfix = v}}/>
        </div>          
        {#if imagingContext.total > 0}
        <div class="w-full pl-4 items-center mb-2">
          <ProgressBar label="Progress Bar" value={imagingContext.succeeded + imagingContext.failed} max={imagingContext.total} />
        </div>
        <div class="w-full pl-4 items-center mb-2">
          <ProgressBar label="Progress Bar" value={imageProgress} max={1} />
        </div>
        {/if}
      </div>
    </li>
  </ul>
</div>

<style>
  .drawer-content {
    width: 100%;
    height: 100%;
    padding: 16px;
  }
  h1 {
    font-family: '源暎エムゴ';
    font-size: 22px;
    margin-bottom: 8px;
  }
  ul {
    margin-top: 16px;
    margin-left: 16px;
  }
  li {
    font-family: 'M PLUS 1';
    font-size: 18px;
    color: #999;
  }
  li.done {
    color: #000;
  }
  button {
    font-family: '源暎エムゴ';
  }
  .image-style {
    font-size: 16px;
    font-weight: 700;
    font-family: '源暎アンチック';
    border-radius: 2px;
    padding-left: 8px;
    padding-right: 8px;
  }
  button {
    height: 30px;
  }
</style>