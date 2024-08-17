<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { notebookOpen } from './notebookStore';
  import NotebookTextarea from './NotebookTextarea.svelte';
  import NotebookCharacterList from './NotebookCharacterList.svelte';
  import { advise } from '../firebase';
  import type { Character } from './notebook';
  import { bookEditor, mainBook, redrawToken } from '../bookeditor/bookStore'
  import { executeProcessAndNotify } from "../utils/executeProcessAndNotify";
  import { GenerateImageContext, generateFluxImage } from '../utils/feathralImaging';
  import { persistent } from '../utils/persistent';
  import Feathral from '../utils/Feathral.svelte';
  import { onlineAccount } from '../utils/accountStore';
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import { ulid } from 'ulid';
  import { onMount, tick } from 'svelte';
  import {makePagesFromStoryboard} from './makePage';

  $: notebook = $mainBook ? $mainBook.notebook : null;

  let themeWaiting = false;
  let charactersWaiting = false;
  let plotWaiting = false;
  let scenarioWaiting = false;
  let storyboardWaiting = false;
  let critiqueWaiting = false;
  let postfix: string = "";

  async function onThemeAdvise(e: CustomEvent<string>) {
    console.log(e.detail);
    themeWaiting = true;
    const result = await advise({action:'theme', notebook});
    themeWaiting = false;
    console.log(result);
    notebook.theme = result.result;
    $onlineAccount.feathral = result.feathral;
  }

  async function onCharactersAdvise(e: CustomEvent) {
    console.log(e.detail);
    charactersWaiting = true;
    notebook.characters = [];
    const result = await advise({action:'characters', notebook});
    charactersWaiting = false;
    console.log(result);
    const newCharacters = result.result;
    for (const c of newCharacters) {
      c.ulid = ulid();
    }
    notebook.characters = newCharacters;
    $onlineAccount.feathral = result.feathral;
  }

  async function onAddCharacter() {
    charactersWaiting = true;
    const result = await advise({action:'characters', notebook});
    charactersWaiting = false;
    console.log(result);
    const newCharacters = result.result;
    for (const c of newCharacters) {
      const index = notebook.characters.findIndex((v) => v.name === c.name);
      if (index < 0) {
        c.ulid = ulid();
      } else {
        c.portrait = notebook.characters[index].portrait;
        c.ulid = notebook.characters[index].ulid;
      }
    }
    notebook.characters = newCharacters;
    $onlineAccount.feathral = result.feathral;
  }

  async function onPlotAdvise(e: CustomEvent<string>) {
    console.log(e.detail);
    plotWaiting = true;
    const result = await advise({action:'plot', notebook});
    plotWaiting = false;
    console.log(result);
    notebook.plot = result.result;
    $onlineAccount.feathral = result.feathral;
  }

  async function onScenarioAdvise(e: CustomEvent<string>) {
    console.log(e.detail);
    scenarioWaiting = true;
    const result = await advise({action:'scenario', notebook});
    scenarioWaiting = false;
    console.log(result);
    notebook.scenario = result.result;
    $onlineAccount.feathral = result.feathral;
  }

  function reset() {
    notebook.theme = '';
    notebook.characters = [];
    notebook.plot = '';
    notebook.scenario = '';
  }

  async function buildStoryboard() {
    console.log('build storyboard');
    storyboardWaiting = true;
    const result = await advise({action:'storyboard', notebook});
    notebook.storyboard = result.result;
    storyboardWaiting = false;
    console.log(result);
    const receivedPages = makePagesFromStoryboard(result.result);
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
  }

  async function onCritiqueAdvise() {
    critiqueWaiting = true;
    const result = await advise({action:'critique', notebook});
    critiqueWaiting = false;
    console.log(result);
    notebook.critique = result.result.critique;
    $onlineAccount.feathral = result.feathral;
  }

  async function onGeneratePortrait(e: CustomEvent<Character>) {
    const c = e.detail;
    c.portrait = 'loading';
    notebook.characters = notebook.characters;
    const result = await executeProcessAndNotify(
      5000, "画像が生成されました",
      async () => {
        return await generateFluxImage(`${postfix}\n${c.appearance}, white background`, "square", false, 1, new GenerateImageContext());
      });
    await result.images[0].decode();
    console.log(result);
    c.portrait = result.images[0]; // HTMLImageElement
    notebook.characters = notebook.characters;
  }

  function onRemoveCharacter(e: CustomEvent<Character>) {
    const c = e.detail;
    const index = notebook.characters.findIndex((v) => v.ulid === c.ulid);
    if (index >= 0) {
      notebook.characters.splice(index, 1);
      notebook.characters = notebook.characters;
    }
  }

  function close() {
    if (JSON.stringify(notebook) !== oldNotebook) {
      $bookEditor.commit(null);
    }
    $notebookOpen = false;
  }

  let oldNotebook: string = null;
  onMount(async () => {
    oldNotebook = JSON.stringify(notebook);
  });

</script>

<div class="drawer-outer">
  <Drawer placement="right" open={$notebookOpen} size="720px" on:clickAway={close}>
    {#if storyboardWaiting}
    <div class="h-full flex flex-col justify-center items-center">
      <h2>ネーム作成中</h2>
      <ProgressRadial width="w-48"/>
    </div>
    {:else}
    <div class="drawer-content">
      <h1>カイルちゃんの創作ノート</h1>
      <div class="flex justify-start">
        <Feathral/>
      </div>
      <div class="section">
        <h2>テーマ</h2>
        <div class="w-full">
          <NotebookTextarea bind:value={notebook.theme} waiting={themeWaiting} on:advise={onThemeAdvise}/>
        </div>
      </div>
      <div class="section">
        <h2>登場人物</h2>
        <div class="w-full">
          <NotebookCharacterList bind:characters={notebook.characters} waiting={charactersWaiting} on:advise={onCharactersAdvise} on:add={onAddCharacter} on:portrait={onGeneratePortrait} on:remove={onRemoveCharacter}/>
        </div>
        <div class="flex flex-row mt-2 items-center">
          <span class="w-16">スタイル</span>
          <input type="text" class="input portrait-style" bind:value={postfix} use:persistent={{db: 'preferences', store:'imaging', key:'style', onLoad: (v) => postfix = v}}/>
        </div>
      </div>
      <div class="section">
        <h2>プロット</h2>
        <div class="w-full">
          <NotebookTextarea bind:value={notebook.plot} waiting={plotWaiting} on:advise={onPlotAdvise} minHeight={180}/>
        </div>
      </div>
      <div class="section">
        <h2>シナリオ</h2>
        <div class="w-full">
          <NotebookTextarea bind:value={notebook.scenario} waiting={scenarioWaiting} on:advise={onScenarioAdvise} minHeight={240}/>
        </div>
      </div>
      <div class="flex flex-row gap-4 mb-4">
        <button class="btn variant-filled-warning" on:click={reset}>リセット</button>
        <span class="flex-grow"></span>
        <button class="btn variant-filled-primary" on:click={buildStoryboard}>ネーム作成！</button>
      </div>
      {#if notebook.storyboard}
        <div class="section">
          <h2>ネームはどう？</h2>
          <div class="w-full">
            <NotebookTextarea bind:value={notebook.critique} waiting={critiqueWaiting} on:advise={onCritiqueAdvise} minHeight={240}/>
          </div>
        </div>
      {/if}
    </div>
    {/if}
  </Drawer>
</div>

<style>
  .drawer-content {
    width: 100%;
    height: 100%;
    padding: 16px;
  }
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
  h1 {
    font-family: '源暎エムゴ';
    font-size: 22px;
    margin-bottom: 8px;
  }
  h2 {
    font-family: '源暎エムゴ';
    font-size: 18px;
  }
  .section {
    margin-bottom: 16px;
  }
  .portrait-style {
    font-size: 16px;
    font-weight: 700;
    font-family: '源暎アンチック';
    border-radius: 2px;
    padding-left: 8px;
    padding-right: 8px;
  }
</style>