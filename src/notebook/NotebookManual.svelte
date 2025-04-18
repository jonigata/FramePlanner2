<script lang="ts">
  import { type CharacterBase, type CharactersBase } from '$bookTypes/notebook';
  import { type Storyboard } from '$bookTypes/storyboard';
  import { type Thinker } from "$protocolTypes/adviseTypes.d";
  import { commitBook, type NotebookLocal, type CharacterLocal } from '../lib/book/book';
  import { bookOperators, mainBook, redrawToken } from '../bookeditor/workspaceStore'
  import { executeProcessAndNotify } from "../utils/executeProcessAndNotify";
  import { type ImagingContext, type Mode, generateMarkedPageImages, generateFluxImage } from '../utils/feathralImaging';
  import { persistentText } from '../utils/persistentText';
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import { ulid } from 'ulid';
  import { onMount, tick } from 'svelte';
  import {makePagesFromStoryboard} from './makePage';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { toolTip } from '../utils/passiveToolTipStore';
  import NotebookTextarea from './NotebookTextarea.svelte';
  import NotebookCharacterList from './NotebookCharacterList.svelte';
  import Feathral from '../utils/Feathral.svelte';
  import { ProgressBar } from '@skeletonlabs/skeleton';
  import FluxModes from '../generator/FluxModes.svelte';
  import { adviseTheme, adviseCharacters, advisePlot, adviseScenario, adviseStoryboard, adviseCritique } from '../supabase';
  import { fileSystem } from '../filemanager/fileManagerStore';
  import { type Folder } from '../lib/filesystem/fileSystem';
  import { rosterOpen, rosterSelectedCharacter, saveCharacterToRoster } from './rosterStore';
  import { waitForChange } from '../utils/reactUtil';
  import { buildMedia } from '../lib/layeredCanvas/dataModels/media';
  import ThinkerSelector from './ThinkerSelector.svelte';
  import NumberEdit from '../utils/NumberEdit.svelte';
  import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';

  let notebook: NotebookLocal | null;
  $: notebook = $mainBook?.notebook ?? null;
  let thinker: Thinker = "sonnet";

  let fullAutoRunning = false;
  let themeWaiting = false;
  let charactersWaiting = false;
  let plotWaiting = false;
  let scenarioWaiting = false;
  let storyboardWaiting = false;
  let critiqueWaiting = false;
  let postfix: string = "";
  let imageProgress = 0;
  let imagingContext: ImagingContext = {
    awakeWarningToken: false,
    errorToken: false,
    total: 0,
    succeeded: 0,
    failed: 0,
  };
  let imagingMode: Mode = "schnell";
  let plotInstruction: string = '';

  let rootFolder: Folder;
  let aiFolder: Folder;
  let rosterFolder: Folder;
  
  let enablePageNumber: boolean = false;
  let pageNumberValue: number = 1;

  $: onNotebookChanged(notebook);
  function onNotebookChanged(notebook: NotebookLocal | null) {
    if (!notebook) {return;}
    console.log("onNotebookChanged", notebook.pageNumber);
    enablePageNumber = notebook.pageNumber !== null;
    pageNumberValue = notebook.pageNumber ?? 1;
  }
  $: onPageNumberChanged(enablePageNumber, pageNumberValue);
  function onPageNumberChanged(enablePageNumber: boolean, pageNumberValue: number) {
    if (notebook) {
      notebook.pageNumber = enablePageNumber ? pageNumberValue : null;
      console.log("change notebook pageNumber", notebook.pageNumber);
    }
  }

  function commit() {
    commitBook($mainBook!, null);
    $mainBook = $mainBook;
  }

  async function onStartFullAuto() {
    if (!notebook) {
      return;
    }

    fullAutoRunning = true;
    if (!notebook.theme) {
      await onThemeAdvise();
    }
    if (notebook.characters.length === 0) {
      await onCharactersAdvise();
    }
    if (!notebook.plot) {
      await onPlotAdvise();
    }
    if (!notebook.scenario) {
      await onScenarioAdvise();
    }
    await onBuildStoryboard();

    await onGenerateImages();

    fullAutoRunning = false;
  }

  function makeRequest() { 
    return {
      thinker,
      notebook: notebook!,
    };
  }

  async function onThemeAdvise() {
    try {
      themeWaiting = true;
      console.log('advise theme', notebook);
      const r = await adviseTheme(makeRequest());
      notebook!.theme = r.theme;
      notebook!.pageNumber = r.pageNumber;
      notebook!.format = r.format;
      commit();
    }
    catch(e) {
      toastStore.trigger({ message: 'AIエラー', timeout: 1500});
      console.error(e);
    }
    finally {
      themeWaiting = false;
    }
  }

  async function onCharactersAdvise() {
    try {
      charactersWaiting = true;
      notebook!.characters = [];
      const newCharacters: CharactersBase = await adviseCharacters(makeRequest()) as CharactersBase;
      newCharacters.forEach((c: CharacterBase) => {
        notebook!.characters.push({
          ...c,
          ulid: ulid(),
          portrait: null,
        });
      });
      commit();
    }
    catch(e) {
      toastStore.trigger({ message: 'AIエラー', timeout: 1500});
      console.error(e);
    }
    finally {
      charactersWaiting = false;
    }
  }

  async function onAddCharacter() {
    try {
      charactersWaiting = true;
      const newCharacters = await adviseCharacters(makeRequest()) as CharactersBase;

      for (const c of newCharacters) {
        const index = notebook!.characters.findIndex((v) => v.name === c.name);
        if (index < 0) {
          notebook!.characters.push({
            ...c,
            ulid: ulid(),
            portrait: null,
          });
        } else {
          Object.assign(notebook!.characters[index], c);
        }
      }
      commit();
    }
    catch(e) {
      toastStore.trigger({ message: 'AIエラー', timeout: 1500});
      console.error(e);
    }
    finally {
      charactersWaiting = false;
    }
  }

  function onAddBlank() {
    const c: CharacterLocal = {
      name: '',
      personality: '',
      appearance: '',
      ulid: ulid(),
      portrait: null,
      themeColor: '#000000',
    };
    notebook!.characters.push(c);
    notebook!.characters = notebook!.characters;
  }

  async function onHireCharacter() {
    console.log('hire character');
    $rosterSelectedCharacter = null;
    let unsubscribe;
    try {
      unsubscribe = rosterSelectedCharacter.subscribe((c) => {
        if (c) {
          // 重複してたら
          if (notebook!.characters.find((v) => v.ulid === c.ulid)) {
            toastStore.trigger({ message: '既に登録されています', timeout: 1500});
          } else {
            c.ulid = ulid();
            notebook!.characters.push(c);
            notebook!.characters = notebook!.characters;
          }
        }
      });
      $rosterOpen = true;
      await waitForChange(rosterOpen, (v) => !v);
    }
    catch(e) {
      toastStore.trigger({ message: 'AIエラー', timeout: 1500});
      console.error(e);
    }
    finally {
      $rosterOpen = false;
      unsubscribe!();
    }
  }

  async function onPlotAdvise() {
    try {
      plotWaiting = true;
      notebook!.plot = await advisePlot({...makeRequest(), instruction:plotInstruction});
      commit();
    }
    catch(e) {
      toastStore.trigger({ message: 'AIエラー', timeout: 1500});
      console.error(e);
    }
    finally {
      plotWaiting = false;
    }
  }

  async function onScenarioAdvise() {
    try {
      scenarioWaiting = true;
      notebook!.scenario = await adviseScenario(makeRequest());
      commit();
    }
    catch(e) {
      toastStore.trigger({ message: 'AIエラー', timeout: 1500});
      console.error(e);
    }
    finally {
      scenarioWaiting = false;
    }
  }

  function reset() {
    notebook!.theme = '';
    notebook!.characters = [];
    notebook!.plot = '';
    notebook!.scenario = '';
    notebook!.storyboard = null;
  }

  async function onBuildStoryboard() {
    console.log('build storyboard');
    try {
      storyboardWaiting = true;
      const result = await adviseStoryboard(makeRequest());
      notebook!.storyboard = result as Storyboard;
      storyboardWaiting = false;
      console.log(result);
      const receivedPages = makePagesFromStoryboard(result as Storyboard);
      let marks = $bookOperators!.getMarks();
      const newPages = $mainBook!.pages.filter((p, i) => !marks[i]);
      const oldLength = newPages.length;
      newPages.push(...receivedPages);
      $mainBook!.pages = newPages;
      commit();

      await tick();
      marks = $bookOperators!.getMarks();
      newPages.forEach((p, i) => {
        if (oldLength <= i) marks[i] = true;
      });
      $bookOperators!.setMarks(marks);
      $redrawToken = true;
    } catch (e) {
      toastStore.trigger({ message: 'AIエラー', timeout: 1500});
      console.error(e);
      storyboardWaiting = false;
    }
  }

  async function onCritiqueAdvise() {
    try {
      critiqueWaiting = true;
      const result = await adviseCritique(makeRequest());
      critiqueWaiting = false;
      console.log(result);
      notebook!.critique = result;
    } catch (e) {
      toastStore.trigger({ message: 'AIエラー', timeout: 1500});
      console.error(e);
    } finally {
      critiqueWaiting = false;
    }
  }

  async function onGeneratePortrait(e: CustomEvent<CharacterLocal>) {
    const c = e.detail;

    c.portrait = 'loading';
    notebook!.characters = notebook!.characters;
    let imagingContext: ImagingContext = {
      awakeWarningToken: false,
      errorToken: false,
      total: 0,
      succeeded: 0,
      failed: 0,
    };
    const canvases = await executeProcessAndNotify(
      5000, "画像が生成されました",
      async () => {
        return await generateFluxImage(`${postfix}\n${c.appearance}, white background`, {width:512,height:512}, imagingMode, 1, imagingContext);
      });
    if (canvases == null) {
      c.portrait = null;
      return;
    }

    c.portrait = buildMedia(canvases[0]); // HTMLImageElement
    notebook!.characters = notebook!.characters;
  }

  function onRemoveCharacter(e: CustomEvent<CharacterLocal>) {
    const c = e.detail;
    const index = notebook!.characters.findIndex((v) => v.ulid === c.ulid);
    if (index >= 0) {
      notebook!.characters.splice(index, 1);
      notebook!.characters = notebook!.characters;
    }
  }

  async function onRegisterCharacter(e: CustomEvent<CharacterLocal>) {
    const ulid = e.detail.ulid!;
    await saveCharacterToRoster($fileSystem!, e.detail);
    toastStore.trigger({ message: 'キャラクターを登録しました', timeout: 1500});
  }

  async function onGenerateImages() {
    imageProgress = 0.001;
    imagingContext = {
      awakeWarningToken: false,
      errorToken: false,
      total: 0,
      succeeded: 0,
      failed: 0,
    };
    await generateMarkedPageImages(
      imagingContext, 
      postfix, 
      imagingMode,
      (x: number) => {
        imageProgress = Math.max(0.001, x);
        imagingContext = imagingContext;
      });
    imageProgress = 1;
  }

  onMount(async () => {
    rootFolder = await $fileSystem!.getRoot();
    aiFolder = (await rootFolder.getEmbodiedEntryByName('AI'))![2].asFolder()!;
    rosterFolder = (await aiFolder.getEmbodiedEntryByName('キャラクター'))![2].asFolder()!;
  });

</script>

{#if storyboardWaiting}
<div class="h-full flex flex-col justify-center items-center">
  <h2>ネーム作成中</h2>
  <ProgressRadial width="w-48"/>
</div>
{:else if 0 < imageProgress && imageProgress < 1}
<div class="h-full flex flex-col justify-center items-center">
  <h2>画像生成中</h2>
  <div class="w-full pl-4 items-center mb-2">
    <ProgressBar label="Progress Bar" value={imagingContext.succeeded + imagingContext.failed} max={imagingContext.total || 1} />
  </div>
  <div class="w-full pl-4 items-center mb-2">
    <ProgressBar label="Progress Bar" value={imageProgress} max={1} />
  </div>
</div>
{:else if notebook} <!-- 絶対に真だがsvelteで!演算子が使えないため -->
<div class="drawer-content">
  <div class="header">
    <h1>カイルちゃんの創作ノート</h1>
    <div class="flex justify-between gap-2 items-center mr-4">
      <Feathral/>
      <ThinkerSelector bind:thinker={thinker}/>
    </div>
  </div>
  <div class="body">
    <div class="section">
    <h2 class:progress={themeWaiting}>テーマ
      {#if themeWaiting}
        <ProgressRadial stroke={200} width="w-5"/>
      {/if}
    </h2>
    <div class="w-full">
      <NotebookTextarea bind:value={notebook.theme} cost={1} waiting={themeWaiting} on:advise={onThemeAdvise} placeholder={"テーマを入力するか、ベルを押してください"}/>
    </div>
    <div class="flex flex-row gap-4 items-center mt-2 mb-2">
      <div class="flex items-center gap-2">
        <span class="text-sm">フォーマット：</span>
        <RadioGroup class="flex">
          <RadioItem bind:group={notebook.format} name="format" value="4koma">
            <span class="text-sm">4コマ</span>
          </RadioItem>
          <RadioItem bind:group={notebook.format} name="format" value="standard">
            <span class="text-sm">標準</span>
          </RadioItem>
        </RadioGroup>
      </div>
      
      <div class="flex items-center gap-2 ml-2">
        <span class="text-sm">ページ数：</span>
        <div class="flex items-center gap-1">
          <input
            type="checkbox"
            class="checkbox"
            checked={enablePageNumber}
            on:change={() => {
              // 明示的に再代入して反応性をトリガー
              enablePageNumber = !enablePageNumber;
              console.log("enablePageNumber:", enablePageNumber);
              
              if (enablePageNumber) {
                notebook.pageNumber = pageNumberValue;
              } else {
                notebook.pageNumber = null;
              }
            }}
          />
          指定
        </div>
        {#if enablePageNumber}
          <div class="number-box ml-1" style="width: 50px; min-width: 50px; height: 24px;" dir="rtl">
            <NumberEdit
              bind:value={pageNumberValue}
              min={1}
              max={5}
            />
          </div>
        {/if}
      </div>
    </div>
    {#if !fullAutoRunning}
      <button class="btn variant-filled-primary" on:click={onStartFullAuto} use:toolTip={"テーマ・キャラ・プロット・シナリオが\nなければ埋め、ネームを作成して画像を生成"}>全自動</button>
    {/if}
  </div>
    <div class="section">
      <h2 class:progress={charactersWaiting}>登場人物
        {#if charactersWaiting}
          <ProgressRadial stroke={200} width="w-5"/>
        {/if}
      </h2>
      <div class="w-full">
        <NotebookCharacterList bind:characters={notebook.characters} waiting={charactersWaiting} on:advise={onCharactersAdvise} on:add={onAddCharacter} on:addBlank={onAddBlank} on:portrait={onGeneratePortrait} on:remove={onRemoveCharacter} on:register={onRegisterCharacter} on:hire={onHireCharacter}/>
      </div>
      <div class="flex flex-row mt-2 items-center">
        <span class="w-16">スタイル</span>
        <input type="text" class="input portrait-style" bind:value={postfix} use:persistentText={{store:'imaging', key:'style', onLoad: (v) => postfix = v}}/>
      </div>
    </div>
    <div class="section">
      <h2 class:progress={plotWaiting}>プロット
        {#if plotWaiting}
          <ProgressRadial stroke={200} width="w-5"/>
        {/if}
      </h2>
      <div class="w-full">
        <NotebookTextarea bind:value={notebook.plot} cost={2} waiting={plotWaiting} on:advise={onPlotAdvise} minHeight={180}/>
        {#if notebook.plot}
          <div class="flex flex-row items-center">
            <span class="w-24">変更指示</span>
            <input type="text" bind:value={plotInstruction} class="input portrait-style"/>
          </div>
        {/if}
      </div>
    </div>
    <div class="section">
      <h2 class:progress={scenarioWaiting}>シナリオ
        {#if scenarioWaiting}
          <ProgressRadial stroke={200} width="w-5"/>
        {/if}
      </h2>
      <div class="w-full">
        <NotebookTextarea bind:value={notebook.scenario} cost={2} waiting={scenarioWaiting} on:advise={onScenarioAdvise} minHeight={240}/>
      </div>
    </div>
    <!-- <div class="section">
      <h2 class="warning">ごめんなさい、ネーム作成はAIの調子が悪く調整中です</h2>
    </div> -->
    <div class="flex flex-row gap-4 mb-4">
      <button class="btn variant-filled-warning" on:click={reset}>リセット</button>
      <span class="flex-grow"></span>
      <button class="btn variant-filled-primary" on:click={onBuildStoryboard} use:toolTip={"コマ割り、プロンプト・フキダシ作成[15]"}>ネーム作成！</button>
    </div>
    {#if notebook.storyboard}
      <div class="flex flex-row gap-4 mb-4 items-center">
        <FluxModes bind:mode={imagingMode} comment={"1コマあたり"}/>
        <span class="flex-grow"></span>
        <button class="btn variant-filled-primary" on:click={onGenerateImages}>画像生成</button>
      </div>
      <div class="section">
        <h2>ネームはどう？</h2>
        <div class="w-full">
          <NotebookTextarea bind:value={notebook.critique} cost={2} waiting={critiqueWaiting} on:advise={onCritiqueAdvise} minHeight={240}/>
        </div>
      </div>
    {/if}
  </div>
</div>
{/if}

<style>
  .drawer-content {
    width: 100%;
    height: 100%;
    padding: 16px;
    padding-right: 0px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .drawer-content .header {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgb(var(--color-surface-200));
    flex-shrink: 0;
  }
  .drawer-content .body {
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
    flex: 1;
    padding-right: 16px;
  }
  h1 {
    font-family: '源暎エムゴ';
    font-size: 32px;
    margin-bottom: 8px;
  }
  h2 {
    font-family: '源暎エムゴ';
    font-size: 18px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  h2.progress {
    color: #0a851a
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
  button {
    font-family: '源暎エムゴ';
    height: 30px;
  }
  /* .warning {
    color: #d1b826;
  } */
</style>