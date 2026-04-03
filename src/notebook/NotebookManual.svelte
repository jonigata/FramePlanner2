<script lang="ts">
  import { type CharacterBase, type CharactersBase } from '$bookTypes/notebook';
  import { type Storyboard } from '$bookTypes/storyboard';
  import { type Thinker } from "$protocolTypes/adviseTypes.d";
  import { commitBook, newPage, type NotebookLocal, type CharacterLocal } from '../lib/book/book';
  import { bookOperators, mainBook, redrawToken } from '../bookeditor/workspaceStore'
  import { executeProcessAndNotify } from "../utils/executeProcessAndNotify";
  import type { ImagingModel } from '$protocolTypes/imagingTypes';
  import { type ImagingContext, generateMarkedPageImages, generateImage, generateImageInline, isContentsPolicyViolationError, portraitsRecordFromNotebook, selectClosestSupportedSize } from '../utils/feathralImaging';
import { isHandledHttpError } from '../utils/edgeFunctions/edgeFunctions';
  import { persistentText } from '../utils/persistentText';
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import { ulid } from 'ulid';
  import { onMount, tick } from 'svelte';
  import {makePagesFromStoryboard, type FourPanelTemplate} from './makePage';
  import { FrameElement, calculatePhysicalLayout, findLayoutOf } from '../lib/layeredCanvas/dataModels/frameTree';
  import type { Vector } from '../lib/layeredCanvas/tools/geometry/geometry';
  import { frameExamples } from '../lib/layeredCanvas/tools/frameExamples';
  import { toastStore } from '@skeletonlabs/skeleton';
  import NotebookTextarea from './NotebookTextarea.svelte';
  import NotebookCharacterList from './NotebookCharacterList.svelte';
  import Feathral from '../utils/Feathral.svelte';
  import { ProgressBar } from '@skeletonlabs/skeleton';
  import ImagingModes from '../generator/ImagingModes.svelte';
  import { modeOptions, getRefMaxForMode } from '../utils/feathralImaging';
  import { adviseTheme, adviseCharacters, advisePlot, adviseScenario, adviseStoryboard, adviseCritique, advisePageGeneration } from '../supabase';
  import { gadgetFileSystem } from '../filemanager/fileManagerStore';
  import { type Folder } from '../lib/filesystem/fileSystem';
  import { rosterOpen, rosterSelectedCharacter, saveCharacterToRoster } from './rosterStore';
  import { waitForChange } from '../utils/reactUtil';
  import { buildMedia, type Media, ImageMedia } from '../lib/layeredCanvas/dataModels/media';
  import NumberEdit from '../utils/NumberEdit.svelte';
  import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
  import { createPreference } from '../preferences';
  import { _ } from 'svelte-i18n';
  import ThinkerSelector from './ThinkerSelector.svelte';
  import { toolTip } from '../utils/passiveToolTipStore';
  import { themeWaiting, plotWaiting, scenarioWaiting, charactersWaiting, runAdviseTheme, runAdvisePlot, runAdviseScenario } from './notebookStore';
  import bellIcon from '../assets/bell.webp';
  import { type BubbleStyleTemplate, DEFAULT_BUBBLE_STYLE_TEMPLATES } from '../lib/layeredCanvas/dataModels/bubbleStyleTemplate';
  import { waitDialog } from '../utils/waitDialog';

  let notebook: NotebookLocal | null;
  $: notebook = $mainBook?.notebook ?? null;
  let thinker: Thinker = "gpt4.1";
  // let thinker: Thinker = "gpt-5-mini"; // Default to the latest model

  let fullAutoRunning = false;
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
    refImages: {},
    maxRefImages: 4,
    autoSizeBase: 1024,
  };
  let imagingMode: ImagingModel = 'schnell';
  let pageImagingMode: ImagingModel = 'nano-banana-pro';
  let plotInstruction: string = '';
  let pagePostfix: string = '';

  let rootFolder: Folder;
  let aiFolder: Folder;
  
  let enablePageNumber: boolean = false;
  let pageNumberValue: number = 1;
  let drawingMode: number | null = null; // null: 未選択, 0: コマごとに作画, 1: ページごとに作画
  let fourPanelTemplate: FourPanelTemplate = '4koma'; // 4コマテンプレート選択
  let bubbleStyleTemplates: BubbleStyleTemplate[] = JSON.parse(JSON.stringify(DEFAULT_BUBBLE_STYLE_TEMPLATES));
  let selectedBubbleStyleIndex: number = 0;

  // Reactive translations for non-component contexts
  $: aiErrorMessage = $_('notebook.errors.aiError');
  $: alreadyRegisteredMessage = $_('notebook.errors.alreadyRegistered');
  $: imageGeneratedMessage = $_('generator.imageGenerated');
  $: characterRegisteredMessage = $_('notebook.errors.characterRegistered');

  // ページ作画用のpaperSize（newPagePropertyから取得）
  $: newPagePaperSize = $mainBook?.newPageProperty?.paperSize ?? [1024, 1024] as [number, number];

  // 選択ページの有無（redrawTokenで再評価をトリガー）
  $: hasMarkedPages = (void $redrawToken, $bookOperators?.getMarks().some(m => m) ?? false);

  $: onNotebookChanged(notebook);
  function onNotebookChanged(notebook: NotebookLocal | null) {
    if (!notebook) {return;}
    enablePageNumber = notebook.pageNumber !== null;
    pageNumberValue = notebook.pageNumber ?? 1;
  }
  $: onPageNumberChanged(enablePageNumber, pageNumberValue);
  function onPageNumberChanged(enablePageNumber: boolean, pageNumberValue: number) {
    if (notebook) {
      notebook.pageNumber = enablePageNumber ? pageNumberValue : null;
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
      await runAdviseTheme(notebook!, thinker);
    } catch (_) {}
  }

  async function onCharactersAdvise() {
    try {
      $charactersWaiting = true;
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
      toastStore.trigger({ message: aiErrorMessage, timeout: 1500});
      console.error(e);
    }
    finally {
      $charactersWaiting = false;
    }
  }

  async function onAddCharacter() {
    try {
      $charactersWaiting = true;
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
      toastStore.trigger({ message: aiErrorMessage, timeout: 1500});
      console.error(e);
    }
    finally {
      $charactersWaiting = false;
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
            toastStore.trigger({ message: alreadyRegisteredMessage, timeout: 1500});
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
      toastStore.trigger({ message: aiErrorMessage, timeout: 1500});
      console.error(e);
    }
    finally {
      $rosterOpen = false;
      unsubscribe!();
    }
  }

  async function onPlotAdvise() {
    try {
      await runAdvisePlot(notebook!, thinker, plotInstruction);
    } catch (_) {}
  }

  async function onScenarioAdvise() {
    try {
      await runAdviseScenario(notebook!, thinker);
    } catch (_) {}
  }

  function reset() {
    notebook!.theme = '';
    notebook!.characters = [];
    notebook!.plot = '';
    notebook!.scenario = '';
    notebook!.storyboard = null;
  }

  async function saveNotebookPreferences() {
    if (!notebook) return;
    const formatPref = createPreference<"4koma" | "standard">('imaging', 'notebookFormat');
    const pageNumberPref = createPreference<number | null>('imaging', 'notebookPageNumber');
    await formatPref.set(notebook.format);
    await pageNumberPref.set(notebook.pageNumber);
  }

  async function onEditBubbleStyleTemplate(addNew: boolean) {
    const result = await waitDialog<{ templates: BubbleStyleTemplate[], selectedIndex: number } | null>('bubbleStyleTemplateEditor', {
      templates: bubbleStyleTemplates,
      selectedIndex: selectedBubbleStyleIndex,
      addNew,
    });
    if (result) {
      bubbleStyleTemplates = result.templates;
      selectedBubbleStyleIndex = result.selectedIndex;
      const templatesPref = createPreference<BubbleStyleTemplate[]>('imaging', 'bubbleStyleTemplates');
      await templatesPref.set(bubbleStyleTemplates);
      const indexPref = createPreference<number>('imaging', 'bubbleStyleTemplateIndex');
      await indexPref.set(selectedBubbleStyleIndex);
    }
  }

  async function onBubbleStyleTemplateChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    if (value === '__add__') {
      // 選択を元に戻す
      selectedBubbleStyleIndex = selectedBubbleStyleIndex;
      await onEditBubbleStyleTemplate(true);
    } else {
      selectedBubbleStyleIndex = Number(value);
      const indexPref = createPreference<number>('imaging', 'bubbleStyleTemplateIndex');
      await indexPref.set(selectedBubbleStyleIndex);
    }
  }

  async function onBuildStoryboard() {
    console.log('build storyboard');
    try {
      storyboardWaiting = true;
      await saveNotebookPreferences();
      const result = await adviseStoryboard(makeRequest());
      notebook!.storyboard = result as Storyboard;
      storyboardWaiting = false;
      console.log(result);
      const receivedPages = makePagesFromStoryboard(result as Storyboard, fourPanelTemplate, notebook!.theme, bubbleStyleTemplates[selectedBubbleStyleIndex]);
      let marks = $bookOperators!.getMarks();
      const newPages = $mainBook!.pages.filter((_p, i) => !marks[i]);
      const oldLength = newPages.length;
      newPages.push(...receivedPages);
      $mainBook!.pages = newPages;
      commit();

      await tick();
      marks = $bookOperators!.getMarks();
      newPages.forEach((_p, i) => {
        if (oldLength <= i) marks[i] = true;
      });
      $bookOperators!.setMarks(marks);
      $redrawToken = true;
    } catch (e) {
      toastStore.trigger({ message: aiErrorMessage, timeout: 1500});
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
      toastStore.trigger({ message: aiErrorMessage, timeout: 1500});
      console.error(e);
    } finally {
      critiqueWaiting = false;
    }
  }

  async function onGeneratePortrait(e: CustomEvent<CharacterLocal>) {
    const c = e.detail;

    c.portrait = 'loading';
    notebook!.characters = notebook!.characters;
    try {
      const canvases = await executeProcessAndNotify(
        5000, imageGeneratedMessage,
        async () => {
          return await generateImage(`${postfix}\n${c.appearance}, white background`, {width:512,height:512}, imagingMode, 1, "opaque", []);
        },
        (r) => r.length > 0);

      c.portrait = buildMedia(canvases[0]); // HTMLImageElement
      notebook!.characters = notebook!.characters;
    }
    catch (e) {
      c.portrait = null;
      notebook!.characters = notebook!.characters;
      if (!isContentsPolicyViolationError(e) && !isHandledHttpError(e)) {
        throw e;
      }
    }
  }

  function onSetPortrait(e: CustomEvent<{ character: CharacterLocal, image: HTMLCanvasElement }>) {
    e.detail.character.portrait = buildMedia(e.detail.image);
    notebook!.characters = notebook!.characters;
  }

  function onErasePortrait(e: CustomEvent<CharacterLocal>) {
    e.detail.portrait = null;
    notebook!.characters = notebook!.characters;
  }

  async function onRegisterCharacter(e: CustomEvent<CharacterLocal>) {
    await saveCharacterToRoster($gadgetFileSystem!, e.detail);
    toastStore.trigger({ message: characterRegisteredMessage, timeout: 1500});
  }

  function onRemoveCharacter(e: CustomEvent<CharacterLocal>) {
    const c = e.detail;
    const index = notebook!.characters.findIndex((v) => v.ulid === c.ulid);
    if (index >= 0) {
      notebook!.characters.splice(index, 1);
      notebook!.characters = notebook!.characters;
    }
  }

  async function onCreatePages() {
    console.log('onCreatePages called (inline mode)');
    try {
      storyboardWaiting = true;
      await saveNotebookPreferences();
      const pages = await advisePageGeneration(makeRequest());
      storyboardWaiting = false;

      // 画像生成の準備
      imagingContext = {
        awakeWarningToken: false,
        errorToken: false,
        total: pages.pages.length,
        succeeded: 0,
        failed: 0,
        refImages: {},
        maxRefImages: getRefMaxForMode(pageImagingMode),
        autoSizeBase: 1024,
      };
      imagingContext.refImages = portraitsRecordFromNotebook(notebook ?? null);

      const npp = $mainBook!.newPageProperty;
      const paperSize = npp.paperSize;

      // モードに応じたサイズを選択（対応サイズが定義されていれば最も近いものを選択）
      const targetSize = { width: paperSize[0], height: paperSize[1] };
      const selectedSize = selectClosestSupportedSize(targetSize, pageImagingMode, 0.7);
      console.log('Target size:', targetSize, 'Selected size:', selectedSize);

      // 各ページを処理（インライン方式）
      for (let pageIndex = 0; pageIndex < pages.pages.length; pageIndex++) {
        const storyboardPage = pages.pages[pageIndex];

        // ページのJSONをそのままプロンプトに
        const pagePrompt = `${pagePostfix}\n${storyboardPage}`;
        console.log('Page prompt:', pagePrompt);

        try {
          // 参照画像を構築（全てのポートレートを渡す）- 重複排除
          const uniqueCanvases = [...new Set(Object.values(imagingContext.refImages))];
          const imageDataUrls = uniqueCanvases
            .slice(0, imagingContext.maxRefImages)
            .map(canvas => canvas.toDataURL('image/png'));

          // 1枚絵ページを作成（先にレイアウト計算してフレームサイズを取得）
          const rootFrameTree = FrameElement.compile(frameExamples["white-paper"].frameTree);
          const frameTree = rootFrameTree.children[0];

          const layout = calculatePhysicalLayout(rootFrameTree, paperSize, [0, 0]);
          const frameLayout = findLayoutOf(layout, frameTree)!;
          const [frameWidth, frameHeight] = frameLayout.size;

          // fitParams: メディアロード後にフィッティングするためのパラメータ
          const fitParams = {
            frameSize: [frameWidth, frameHeight] as Vector,
            paperSize: paperSize
          };

          // インライン画像生成 - リクエスト情報を埋め込んだFilmを返す（API呼び出しはfilmProcessorQueueで行われる）
          // フィッティングはメディアロード後にfilmProcessorStoreで行われる
          const film = generateImageInline(
            pagePrompt,
            selectedSize,
            pageImagingMode,
            "opaque",
            imageDataUrls,
            { kind: 'none' },
            fitParams
          );

          frameTree.filmStack.films = [film];
          frameTree.prompt = pagePrompt;

          const page = newPage(rootFrameTree, []);
          page.paperSize = [...paperSize];
          page.paperColor = npp.paperColor;
          page.frameColor = npp.frameColor;
          page.frameWidth = npp.frameWidth;
          page.source = storyboardPage;

          $mainBook!.pages.push(page);
          imagingContext.succeeded++;
        } catch (e) {
          console.error('Image generation request failed for page', pageIndex, e);
          imagingContext.failed++;
          if (!isContentsPolicyViolationError(e)) {
            toastStore.trigger({ message: aiErrorMessage, timeout: 1500 });
          }
        }

        imagingContext = imagingContext;
      }

      commit();
      $redrawToken = true;
      toastStore.trigger({ message: `${pages.pages.length}ページの画像生成を開始しました`, timeout: 3000 });

    } catch (e) {
      toastStore.trigger({ message: aiErrorMessage, timeout: 1500 });
      console.error(e);
      storyboardWaiting = false;
    }
  }

  async function onGenerateImages() {
    console.log("[DEBUG onGenerateImages] Starting");
    imageProgress = 0.001;
    imagingContext = {
      awakeWarningToken: false,
      errorToken: false,
      total: 0,
      succeeded: 0,
      failed: 0,
      refImages: {},
      maxRefImages: 4,
      autoSizeBase: 1024,
    };
    // 参考画像として登場人物のポートレートを格納（feathralImaging に集約）
    imagingContext.refImages = portraitsRecordFromNotebook(notebook ?? null);
    console.log("[DEBUG onGenerateImages] refImages count:", Object.keys(imagingContext.refImages).length);
    try {
      await generateMarkedPageImages(
        imagingContext,
        postfix,
        imagingMode,
        (x: number) => {
          imageProgress = Math.max(0.001, x);
          imagingContext = imagingContext;
        });
      console.log("[DEBUG onGenerateImages] Completed successfully. succeeded:", imagingContext.succeeded, "failed:", imagingContext.failed);
    } catch (e) {
      console.error("[DEBUG onGenerateImages] Error:", e);
    }
    imageProgress = 1;
    console.log("[DEBUG onGenerateImages] Done, imageProgress set to 1");
  }

  onMount(async () => {
    rootFolder = await $gadgetFileSystem!.getRoot();
    aiFolder = (await rootFolder.getEmbodiedEntryByName('AI'))![2].asFolder()!;

    const preference = createPreference<string>('imaging', 'style');
    postfix = await preference.getOrDefault('Japanese anime style');

    const templatesPref = createPreference<BubbleStyleTemplate[]>('imaging', 'bubbleStyleTemplates');
    const savedTemplates = await templatesPref.get();
    if (savedTemplates && savedTemplates.length > 0) {
      bubbleStyleTemplates = savedTemplates;
    }
    const indexPref = createPreference<number>('imaging', 'bubbleStyleTemplateIndex');
    selectedBubbleStyleIndex = await indexPref.getOrDefault(0);
    if (selectedBubbleStyleIndex >= bubbleStyleTemplates.length) {
      selectedBubbleStyleIndex = 0;
    }
  });

  // 選択中のモードに応じて参照画像上限を同期
  $: imagingContext.maxRefImages = getRefMaxForMode(imagingMode);

</script>

{#if storyboardWaiting}
<div class="h-full flex flex-col justify-center items-center">
  <h2>{$_('notebook.manual.creatingStoryboard')}</h2>
  <ProgressRadial width="w-48"/>
</div>
{:else if 0 < imageProgress && imageProgress < 1}
<div class="h-full flex flex-col justify-center items-center">
  <h2>{$_('notebook.manual.generatingImage')}</h2>
  {#if drawingMode !== 1}
    <div class="w-full pl-4 items-center mb-2">
      <ProgressBar label="Progress Bar" value={imagingContext.succeeded + imagingContext.failed} max={imagingContext.total || 1} />
    </div>
  {/if}
  <div class="w-full pl-4 items-center mb-2">
    <ProgressBar label="Progress Bar" value={imageProgress} max={1} />
  </div>
</div>
{:else if notebook} <!-- 絶対に真だがsvelteで!演算子が使えないため -->
<div class="drawer-content">
  <div class="header">
    <h1>{$_('notebook.manual.title')}</h1>
    <p class="text-sm">ベルボタンを押しながら作品を作っていきましょう。フルオートなら全部自動で進めるよ！</p>
    <div class="flex justify-between gap-2 items-center mr-4">
      <Feathral/>
      <!-- <ThinkerSelector bind:thinker={thinker}/> -->
    </div>
  </div>
  <div class="body">
    <div class="section">
    <h2 class:progress={$themeWaiting}>{$_('notebook.manual.theme')}
      {#if $themeWaiting}
        <ProgressRadial stroke={200} width="w-5"/>
      {/if}
    </h2>
    <div class="w-full">
      <NotebookTextarea bind:value={notebook.theme} cost={1} waiting={$themeWaiting} on:advise={onThemeAdvise}/>
    </div>
    <div class="flex flex-row gap-4 items-center mt-2 mb-2">
      <div class="flex items-center gap-2">
        <span class="text-sm">{$_('notebook.manual.format')}</span>
        <RadioGroup class="flex">
          <RadioItem bind:group={notebook.format} name="format" value="4koma">
            <span class="text-sm">{$_('notebook.manual.fourPanel')}</span>
          </RadioItem>
          <RadioItem bind:group={notebook.format} name="format" value="standard">
            <span class="text-sm">{$_('notebook.manual.standard')}</span>
          </RadioItem>
        </RadioGroup>
      </div>
      
      <div class="flex items-center gap-2 ml-2">
        <span class="text-sm">{$_('notebook.manual.pageCount')}</span>
        <div class="flex items-center gap-1">
          <input
            type="checkbox"
            class="checkbox"
            checked={enablePageNumber}
            on:change={() => {
              // 明示的に再代入して反応性をトリガー
              enablePageNumber = !enablePageNumber;
              
              if (enablePageNumber) {
                notebook.pageNumber = pageNumberValue;
              } else {
                notebook.pageNumber = null;
              }
            }}
          />
          {$_('notebook.manual.specify')}
        </div>
        {#if enablePageNumber}
          <div class="number-box ml-1" style="width: 50px; min-width: 50px; height: 24px;" dir="rtl">
            <NumberEdit
              bind:value={pageNumberValue}
              min={1}
              max={20}
            />
          </div>
        {/if}
      </div>
    </div>
    {#if !fullAutoRunning}
      <div class="flex flex-row gap-2">
        <button class="btn variant-filled-primary" on:click={onStartFullAuto} use:toolTip={"すべてオートで進める"}>{$_('notebook.manual.fullAuto')}</button>
        <span class="flex-grow"></span>
        <button class="btn variant-filled-warning" on:click={reset} use:toolTip={"入力したものをクリア"}>{$_('notebook.manual.reset')}</button>
      </div>
    {/if}
  </div>
    <div class="section">
      <h2 class:progress={$charactersWaiting}>{$_('notebook.manual.characters')}
        {#if $charactersWaiting}
          <ProgressRadial stroke={200} width="w-5"/>
        {/if}
      </h2>
      <div class="w-full">
        <NotebookCharacterList 
          bind:characters={notebook.characters} 
          waiting={$charactersWaiting} 
          on:advise={onCharactersAdvise} 
          on:add={onAddCharacter} 
          on:addBlank={onAddBlank} 
          on:setPortrait={onSetPortrait}
          on:erasePortrait={onErasePortrait}
          on:portrait={onGeneratePortrait} 
          on:remove={onRemoveCharacter} 
          on:register={onRegisterCharacter} 
          on:hire={onHireCharacter}/>
      </div>
    </div>
    <div class="section">
      <h2 class:progress={$plotWaiting}>{$_('notebook.manual.plot')}
        {#if $plotWaiting}
          <ProgressRadial stroke={200} width="w-5"/>
        {/if}
      </h2>
      <div class="w-full">
        <NotebookTextarea bind:value={notebook.plot} cost={2} waiting={$plotWaiting} on:advise={onPlotAdvise} minHeight={180}/>
        {#if notebook.plot}
          <div class="flex flex-row items-center">
            <span class="w-24">{$_('notebook.manual.changeInstruction')}</span>
            <input type="text" bind:value={plotInstruction} class="input portrait-style"/>
          </div>
        {/if}
      </div>
    </div>
    <div class="section">
      <h2 class:progress={$scenarioWaiting}>{$_('notebook.manual.scenario')}
        {#if $scenarioWaiting}
          <ProgressRadial stroke={200} width="w-5"/>
        {/if}
      </h2>
      <div class="w-full">
        <NotebookTextarea bind:value={notebook.scenario} cost={2} waiting={$scenarioWaiting} on:advise={onScenarioAdvise} minHeight={240}/>
      </div>
    </div>
    <div class="drawing-mode-selector">
      <button
        class="mode-btn mode-btn-0"
        class:selected={drawingMode === 0}
        on:click={() => drawingMode = drawingMode === 0 ? null : 0}
      >コマごとに作画</button>
      <button
        class="mode-btn mode-btn-1"
        class:selected={drawingMode === 1}
        on:click={() => drawingMode = drawingMode === 1 ? null : 1}
      >ページごとに作画</button>
    </div>
    <div class="drawing-panel">
      {#if drawingMode === 0}
        <div class="section">
          <h2>{$_('notebook.manual.createStoryboard')}</h2>
          {#if notebook.format === '4koma'}
            <div class="flex items-center gap-2 mb-2 ml-4">
              <span class="text-sm">{$_('notebook.manual.fourPanelTemplate')}</span>
              <select bind:value={fourPanelTemplate} class="select text-sm py-1 px-2" style="width: auto;">
                <option value="4koma">{$_('notebook.manual.templateNormal')}</option>
                <option value="4koma-wide">{$_('notebook.manual.templateWide')}</option>
                <option value="4koma-splash">{$_('notebook.manual.templateSplash')}</option>
              </select>
            </div>
          {/if}
          <div class="flex items-center gap-2 mb-2 ml-4">
            <span class="text-sm">フキダシスタイル</span>
            <select class="select text-sm py-1 px-2" style="width: auto;" value={selectedBubbleStyleIndex} on:change={onBubbleStyleTemplateChange}>
              {#each bubbleStyleTemplates as t, i}
                <option value={i}>{t.name}</option>
              {/each}
              <option value="__add__">+ 新規追加...</option>
            </select>
            <button class="btn btn-sm variant-ghost" on:click={() => onEditBubbleStyleTemplate(false)}>編集</button>
          </div>
          <div class="flex justify-center">
            <button class="btn variant-filled-primary action-btn" on:click={onBuildStoryboard} use:toolTip={"1コマずつ画像生成する方式でページを作成"}><img src={bellIcon} alt="bell" class="bell-icon"/>{$_('notebook.manual.createStoryboard')}</button>
          </div>
        </div>
        <div class="section">
          <h2>{$_('notebook.manual.imageGeneration')}</h2>
          <div class="ml-4">
            <ImagingModes bind:model={imagingMode} group="ref" preferenceKey="notebookMode" imageSize={{width: 1024, height: 1024}} comment={$_('generator.perPanel')} placement="top" width={350}/>
            <p class="text-xs mt-1 mb-2">☆マークは登場人物画像を参照します</p>
            <div class="flex flex-col mt-2 gap-1">
              <span>{$_('notebook.manual.style')}</span>
              <textarea class="textarea portrait-style" rows="2" bind:value={postfix} use:persistentText={{store:'imaging', key:'style', defaultValue: 'Japanese anime style', onLoad: (v) => postfix = v}}></textarea>
            </div>
          </div>
          <div class="flex flex-col items-center mt-4 gap-2">
            {#if !hasMarkedPages}
              <p class="text-sm text-error-600">選択されているページがありません ネームを生成してください</p>
            {/if}
            <button disabled={!hasMarkedPages} class="btn variant-filled-primary action-btn" on:click={onGenerateImages}><img src={bellIcon} alt="bell" class="bell-icon"/>{$_('notebook.manual.generateImage')}</button>
          </div>
          <div class="w-full mt-4">
            <h2>{$_('notebook.manual.howAboutStoryboard')}</h2>
            <NotebookTextarea bind:value={notebook.critique} cost={2} waiting={critiqueWaiting} on:advise={onCritiqueAdvise} minHeight={240}/>            
          </div>
        </div>
      {:else if drawingMode === 1}
        <div class="section">
          <h2>{$_('notebook.manual.imageGeneration')}</h2>
          <div class="ml-4">
            <ImagingModes bind:model={pageImagingMode} group="page" preferenceKey="pageMode" imageSize={{width: newPagePaperSize[0], height: newPagePaperSize[1]}} placement="top" width={350}/>
            <div class="flex flex-col mt-2 gap-1">
              <span>{$_('notebook.manual.style')}</span>
              <textarea class="textarea portrait-style" rows="2" bind:value={pagePostfix} use:persistentText={{store:'imaging', key:'pageStyle', defaultValue: '右から左に読むマンガ。縦書き。コマの中の絵のスタイルは日本アニメ風のイラスト', onLoad: (v) => pagePostfix = v}}></textarea>
            </div>
          </div>
        </div>
        <div class="section">
          <h2>{$_('notebook.manual.createPages')}</h2>
          <div class="flex justify-center">
            <button class="btn variant-filled-primary action-btn" on:click={onCreatePages} use:toolTip={"1ページずつ直接画像生成"}><img src={bellIcon} alt="bell" class="bell-icon"/>{$_('notebook.manual.createPages')}</button>
          </div>
        </div>
      {:else}
        <p class="text-center text-surface-500">作画モードを選択してください</p>
      {/if}
    </div>
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
  .drawing-mode-selector {
    display: flex;
    gap: 16px;
    margin-top: 16px;
  }
  .mode-btn {
    flex: 1;
    font-family: '源暎エムゴ';
    font-size: 20px;
    height: auto;
    padding: 24px 24px;
    border-radius: 8px;
    border: 2px solid;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .mode-btn-0 {
    background-color: #e8f4fc;
    border-color: #3498db;
    color: #2471a3;
  }
  .mode-btn-0:hover {
    background-color: #d4e9f7;
  }
  .mode-btn-0.selected {
    background-color: #3498db;
    color: white;
  }
  .mode-btn-1 {
    background-color: #fdedec;
    border-color: #e74c3c;
    color: #c0392b;
  }
  .mode-btn-1:hover {
    background-color: #f9dbd9;
  }
  .mode-btn-1.selected {
    background-color: #e74c3c;
    color: white;
  }
  .drawing-panel {
    margin-top: 16px;
    padding: 16px;
    border: 1px solid rgb(var(--color-surface-400));
    border-radius: 8px;
    background-color: rgb(var(--color-surface-100));
    min-height: 800px;
  }
  .action-btn {
    font-size: 18px;
    padding: 12px 24px;
    height: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .bell-icon {
    width: 24px;
    height: 24px;
  }
</style>
