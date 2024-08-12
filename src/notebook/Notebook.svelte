<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { notebookOpen } from './notebookStore';
  import NotebookTextarea from './NotebookTextarea.svelte';
  import NotebookCharacterList from './NotebookCharacterList.svelte';
  import { Notebook } from './notebook';
  import { advise } from '../firebase';
  import type { Character } from './notebook';
  import type { Context } from "../mascot/servantContext";
  import { makePage } from '../mascot/storyboardServant';
  import { mainBook } from '../bookeditor/bookStore'
  import { executeProcessAndNotify } from "../utils/executeProcessAndNotify";
  import { GenerateImageContext, generateFluxImage } from '../utils/feathralImaging';
  import { persistent } from '../utils/persistent';
  import Feathral from '../utils/Feathral.svelte';
  import { onlineAccount } from '../utils/accountStore';
  import { ProgressRadial } from '@skeletonlabs/skeleton';

  let theme = '';
  let themeWaiting = false;
  let characters: Character[] = [];
  let charactersWaiting = false;
  let plot = '';
  let plotWaiting = false;
  let scenario = '';
  let scenarioWaiting = false;
  let storyboardWaiting = false;
  let postfix: string = "";

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
    $onlineAccount.feathral = result.feathral;
  }

  async function onCharactersAdvice(e: CustomEvent) {
    console.log(e.detail);
    charactersWaiting = true;
    characters = [];
    const result = await advise({action:'characters', notebook:makeNotebook()});
    charactersWaiting = false;
    console.log(result);
    characters = result.result;
    $onlineAccount.feathral = result.feathral;
  }

  async function onAddCharacter() {
    charactersWaiting = true;
    const result = await advise({action:'characters', notebook:makeNotebook()});
    charactersWaiting = false;
    console.log(result);
    const newCharacters = result.result;
    for (const c of newCharacters) {
      const index = characters.findIndex((v) => v.name === c.name);
      if (index !== -1) {
        c.portrait = characters[index].portrait;
      }
    }
    characters = newCharacters;
    $onlineAccount.feathral = result.feathral;
  }

  async function onPlotAdvice(e: CustomEvent<string>) {
    console.log(e.detail);
    plotWaiting = true;
    const result = await advise({action:'plot', notebook:makeNotebook()});
    plotWaiting = false;
    console.log(result);
    plot = result.result;
    $onlineAccount.feathral = result.feathral;
  }

  async function onScenarioAdvice(e: CustomEvent<string>) {
    console.log(e.detail);
    scenarioWaiting = true;
    const result = await advise({action:'scenario', notebook:makeNotebook()});
    scenarioWaiting = false;
    console.log(result);
    scenario = result.result;
    $onlineAccount.feathral = result.feathral;
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

  async function onGeneratePortrait(e: CustomEvent<Character>) {
    const c = e.detail;
    c.portrait = 'loading';
    characters = characters;
    const result = await executeProcessAndNotify(
      5000, "画像が生成されました",
      async () => {
        return await generateFluxImage(`${postfix}\n${c.appearanceEn}, white background`, "square", false, 1, new GenerateImageContext());
      });
    await result.images[0].decode();
    console.log(result);
    c.portrait = result.images[0]; // HTMLImageElement
    characters = characters;
  }

</script>

<div class="drawer-outer">
  <Drawer placement="right" open={$notebookOpen} size="720px" on:clickAway={() => $notebookOpen = false}>
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
          <NotebookTextarea bind:value={theme} waiting={themeWaiting} on:advise={onThemeAdvice}/>
        </div>
      </div>
      <div class="section">
        <h2>登場人物</h2>
        <div class="w-full">
          <NotebookCharacterList bind:characters={characters} waiting={charactersWaiting} on:advise={onCharactersAdvice} on:add={onAddCharacter} on:portrait={onGeneratePortrait}/>
        </div>
        <div class="flex flex-row mt-2 items-center">
          <span class="w-16">スタイル</span>
          <input type="text" class="input portrait-style" bind:value={postfix} use:persistent={{db: 'preferences', store:'imaging', key:'style', onLoad: (v) => postfix = v}}/>
        </div>
      </div>
      <div class="section">
        <h2>プロット</h2>
        <div class="w-full">
          <NotebookTextarea bind:value={plot} waiting={plotWaiting} on:advise={onPlotAdvice} minHeight={180}/>
        </div>
      </div>
      <div class="section">
        <h2>シナリオ</h2>
        <div class="w-full">
          <NotebookTextarea bind:value={scenario} waiting={scenarioWaiting} on:advise={onScenarioAdvice} minHeight={240}/>
        </div>
      </div>
      <div class="flex flex-row gap-4">
        <button class="btn variant-filled-warning" on:click={reset}>リセット</button>
        <span class="flex-grow"></span>
        <button class="btn variant-filled-primary" on:click={buildStoryboard}>ネーム作成！</button>
      </div>
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