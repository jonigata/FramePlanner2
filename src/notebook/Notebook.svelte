<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { notebookOpen } from './notebookStore';
  import NotebookTextarea from './NotebookTextarea.svelte';
  import NotebookCharacter from './NotebookCharacter.svelte';
  import { Notebook } from './notebook';
  import { advise } from '../firebase';
  import type { Character } from './notebook';
  import type { Context } from "../mascot/servantContext";
  import { makePage } from '../mascot/storyboardServant';
  import { mainBook } from '../bookeditor/bookStore'

  let theme = '';
  let themeWaiting = false;
  let characters: Character[] = [];
  let charactersWaiting = false;
  let plot = '';
  let plotWaiting = false;
  let scenario = '';
  let scenarioWaiting = false;
  let storyboardWaiting = false;

  function makeNotebook(): Notebook {
    console.log('make notebook');
    return {
      characters,
      theme,
      plot,
      scenario,
    }
  }

  async function onThemeAdvice(e: CustomEvent<string>) {
    console.log(e.detail);
    themeWaiting = true;
    const result = await advise({action:'theme', notebook:makeNotebook()});
    themeWaiting = false;
    console.log(result);
    theme = result.result;
  }

  async function onCharactersAdvice(e: CustomEvent) {
    console.log(e.detail);
    charactersWaiting = true;
    const result = await advise({action:'characters', notebook:makeNotebook()});
    charactersWaiting = false;
    console.log(result);
    characters = result.result;
  }

  async function onPlotAdvice(e: CustomEvent<string>) {
    console.log(e.detail);
    plotWaiting = true;
    const result = await advise({action:'plot', notebook:makeNotebook()});
    plotWaiting = false;
    console.log(result);
    plot = result.result;
  }

  async function onScenarioAdvice(e: CustomEvent<string>) {
    console.log(e.detail);
    scenarioWaiting = true;
    const result = await advise({action:'scenario', notebook:makeNotebook()});
    scenarioWaiting = false;
    console.log(result);
    scenario = result.result;
  }

  function reset() {
    theme = '';
    characters = [];
    plot = '';
    scenario = '';
  }

  async function buildStoryboard() {
    console.log('build storyboard');
    storyboardWaiting = true;
    const result = await advise({action:'storyboard', notebook:makeNotebook()});
    storyboardWaiting = false;
    console.log(result);
    const context: Context = {
      book: $mainBook,
      pageIndex: 0,
    };
    makePage(context, result.result);
    $mainBook = $mainBook;
  }

</script>

<div class="drawer-outer">
  <Drawer placement="right" open={$notebookOpen} size="720px" on:clickAway={() => $notebookOpen = false}>
    <div class="drawer-content">
      <h1>カイルちゃんの創作ノート</h1>
      <div class="section">
        <h2>テーマ</h2>
        <div class="w-full">
          <NotebookTextarea bind:value={theme} waiting={themeWaiting} on:advise={onThemeAdvice}/>
        </div>
      </div>
      <div class="section">
        <h2>登場人物</h2>
        <div class="w-full">
          <NotebookCharacter bind:characters={characters} waiting={charactersWaiting} on:advise={onCharactersAdvice}/>
        </div>
      </div>
      <div class="section">
        <h2>プロット</h2>
        <div class="w-full">
          <NotebookTextarea bind:value={plot} waiting={plotWaiting} on:advise={onPlotAdvice} height={48}/>
        </div>
      </div>
      <div class="section">
        <h2>シナリオ</h2>
        <div class="w-full">
          <NotebookTextarea bind:value={scenario} waiting={scenarioWaiting} on:advise={onScenarioAdvice} height={48}/>
        </div>
      </div>
      <div class="flex flex-row gap-4">
        <button class="btn variant-filled-warning" on:click={reset}>リセット</button>
        <span class="flex-grow"></span>
        <button class="btn variant-filled-primary" on:click={buildStoryboard}>ネーム作成！</button>
      </div>
    </div>
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
</style>