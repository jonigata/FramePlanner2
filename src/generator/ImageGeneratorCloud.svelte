<script lang="ts">
  import { ProgressBar } from '@skeletonlabs/skeleton';
	import Gallery from '../gallery/Gallery.svelte';
  import { onlineAccount, onlineStatus } from "../utils/accountStore";
  import SignInPromptInline from '../utils/SignInPromptInline.svelte';
  import { onMount } from 'svelte';
  import Feathral from '../utils/Feathral.svelte';
  import { persistentText } from '../utils/persistentText';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { executeProcessAndNotify } from "../utils/executeProcessAndNotify";
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import type { ImagingModel, ImagingProvider, ImagingBackground } from '$protocolTypes/imagingTypes';
  import { calculateCost, generateImage, modeOptions as unifiedModeOptions, isContentsPolicyViolationError, getRefMaxForMode, supportsRefImages, getTimeFactorForMode } from '../utils/feathralImaging';
  import { toolTip } from '../utils/passiveToolTipStore';
  import ImagingModes from './ImagingModes.svelte';
  import ImageSizeControls from './ImageSizeControls.svelte';
  import { ImageMedia, type Media } from "../lib/layeredCanvas/dataModels/media";
  import { _ } from 'svelte-i18n';
  import ReferenceImageDropzone from '../utils/ReferenceImageDropzone.svelte';
  import RosterPortraitPicker from '../utils/RosterPortraitPicker.svelte';
  import type { GalleryItem } from '../gallery/gallery';
  import { mainBook } from '../bookeditor/workspaceStore';
  import { get } from 'svelte/store';
  import { portraitsRecordFromNotebook, buildImageDataUrlsForPrompt } from '../utils/feathralImaging';

  import clipboardIcon from '../assets/clipboard.webp';
  import FeathralCost from '../utils/FeathralCost.svelte';

  import { getSupportedSizesForMode } from '../utils/feathralImaging';
  import { findClosestSize, calculateAspectPreservingSize, type SizePair } from '../lib/layeredCanvas/tools/imageUtil';

  export let busy: boolean;
  export let prompt: string;
  export let gallery: Media[];
  export let chosen: Media | null;
  export let frameSize: [number, number];

  let progress = 0;
  let refered: Media | null= null;
  let postfix: string = "";
  let batchCount = 1;
  let model: ImagingModel = 'schnell';
  let width = 1024;
  let height = 1024;
  let estimatedCost = 0;
  let uiType: ImagingProvider | undefined;
  let sizeText = "1024x1024";
  let background: ImagingBackground = "opaque";
  let nanoBananaAspectRatio = "1:1";
  let autoSizeBase = 1024;

  // 参考画像UI用（UIのみ。生成処理への結線は未対応）
  let referenceImages: GalleryItem[] = [];
  let referenceMedias: Media[] = [];
  $: referenceImagesSupported = supportsRefImages(model);
  $: refMax = getRefMaxForMode(model);
  $: if (!referenceImagesSupported) {
    if (referenceImages.length > 0 || referenceMedias.length > 0) {
      referenceImages = [];
      referenceMedias = [];
    }
  } else if (refMax > 0) {
    // モデル切り替えで上限が変わった場合にUIを追従させる
    if (referenceImages.length > refMax) {
      referenceImages = referenceImages.slice(0, refMax);
    }
    if (referenceMedias.length > refMax) {
      referenceMedias = referenceMedias.slice(0, refMax);
    }
  }

  function onRosterPick(e: CustomEvent<Media>) {
    const media = e.detail;
    const loader = async (): Promise<Media[]> => {
      referenceMedias = [...referenceMedias, media];
      return [media];
    };
    referenceImages = [...referenceImages, loader];
  }

  function onChooseImage({detail}: CustomEvent<Media>) {
    chosen = detail;
  }

  const NANO_BANANA_ASPECT_RATIOS = ["21:9", "16:9", "3:2", "4:3", "5:4", "1:1", "4:5", "3:4", "2:3", "9:16"];

  function findClosestNanoBananaAspect(targetRatio: number): string {
    let best = NANO_BANANA_ASPECT_RATIOS[0];
    let bestDiff = Infinity;
    for (const ar of NANO_BANANA_ASPECT_RATIOS) {
      const [aw, ah] = ar.split(':').map(Number);
      const diff = Math.abs(Math.log(aw / ah) - Math.log(targetRatio));
      if (diff < bestDiff) {
        bestDiff = diff;
        best = ar;
      }
    }
    return best;
  }

  function autoSizeFromFrame() {
    const isNanoBanana = model === 'nano-banana' || model === 'nano-banana-pro' || model === 'nano-banana-2';
    if (isNanoBanana) {
      const targetRatio = frameSize[0] / frameSize[1];
      nanoBananaAspectRatio = findClosestNanoBananaAspect(targetRatio);
      return;
    }

    const target: SizePair = { width: frameSize[0], height: frameSize[1] };
    const supportedSizes = getSupportedSizesForMode(model);
    if (supportedSizes && supportedSizes.length > 0) {
      const best = findClosestSize(target, [...supportedSizes], 0.7);
      width = best.width;
      height = best.height;
      sizeText = `${best.width}x${best.height}`;
    } else {
      const maxLong = Math.round(autoSizeBase * 1.5);
      const minShort = Math.round(autoSizeBase * 0.5);
      const result = calculateAspectPreservingSize(target, autoSizeBase, 128, maxLong, minShort);
      width = result.width;
      height = result.height;
    }
  }

  $: onChangeMode(model, sizeText);
  function onChangeMode(mode: ImagingModel, st: string) {
    // allowTextEdit is false here, so we assume imaging
    uiType = unifiedModeOptions.find(m => m.value === mode)?.uiType;
    if (uiType == 'gpt-image-1' || uiType == 'gpt-image-1.5') {
      width = st == "1536x1024" ? 1536 : 1024;
      height = st == "1024x1536" ? 1536 : 1024;
      console.log(width, height);
    }
  }

  async function generate() {
    if (model === 'pro' && 1 < batchCount ) {
      toastStore.trigger({ message: $_('generator.proModeMultipleImagesNotSupported'), timeout: 2000 });
      batchCount = 1;
    }

    busy = true;
    let q: ReturnType<typeof setInterval> | undefined = undefined;
    try {
      progress = 0;
      let pixelRatio = width * height / 1024 / 1024;

      // 参照画像（上限はrefRange.maxまで）。
      // プロンプト中の [ref:###] を解析し、Notebook のキャラクタ画像を優先採用し、
      // 余剰枠をドロップゾーン画像で補完。
      const refMaxLocal = getRefMaxForMode(model);
      const notebook = get(mainBook)?.notebook ?? null;
      const refMap = portraitsRecordFromNotebook(notebook);
      const fallbackCanvases = referenceMedias.map(m => m.drawSourceCanvas);
      const imageDataUrls = buildImageDataUrlsForPrompt(
        `${postfix}\n${prompt}`,
        refMap,
        refMaxLocal,
        fallbackCanvases
      );

      // 参照画像の枚数で推定時間を増やす: 0枚=1x, 1枚=2x, 2枚以上=3x
      const refMultiplier = 1 + Math.min(2, imageDataUrls.length);
      const delta = 1 / (getTimeFactorForMode(model) * refMultiplier) / pixelRatio;
      q = setInterval(() => {progress = Math.min(1.0, progress+delta);}, 1000);


      const canvases = await executeProcessAndNotify(
        5000, $_('generator.imageGenerated'),
        async () => {
          return await generateImage(
            `${postfix}\n${prompt}`,
            { width, height },
            model,
            batchCount,
            background,
            imageDataUrls
          );
          // return { feathral: 99, result: { image: makePlainImage(imageRequest.width, imageRequest.height, "#00ff00ff") } };
        },
        (r) => r.length > 0);
      gallery.push(...canvases.map(c => new ImageMedia(c)));
      gallery = gallery;

      progress = 1;
    }
    catch (e) {
      if (!isContentsPolicyViolationError(e)) {
        throw e;
      }
    }
    finally {
      clearInterval(q);
      busy = false;
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(prompt);
    toastStore.trigger({ message: $_('generator.copiedToClipboard'), timeout: 1500});
  }

  $: estimatedCost = batchCount * calculateCost({width,height}, model, []);

  onMount(async () => {
  });

</script>

<div class="drawer-content">
  {#if $onlineStatus === 'signed-in'}
  <div class="mode-header-row">
    <h2>{$_('generator.mode')}</h2>
    <Feathral/>
  </div>
  <div class="vbox left gap-2 mode">
    <ImagingModes bind:model={model} group="imaging" imageSize={{ width, height }}/>
  </div>

  <h2>{$_('generator.style')}</h2>
  <textarea class="w-96 textarea" bind:value={postfix} use:persistentText={{store:'imaging', key:'style', onLoad: (v) => postfix = v}}/>
  <h2>{$_('generator.prompt')}</h2>
  <div class="textarea-container">
    <textarea class="textarea h-32" bind:value={prompt}/>
    <div class="icon-container flex flex-row-reverse gap-2">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img src={clipboardIcon} alt={$_('generator.copyToClipboard')} on:click={copyToClipboard} use:toolTip={$_('generator.copyToClipboard')} />
    </div>
  </div>        

  {#if referenceImagesSupported}
  <h2>
    {$_('dialogs.textEdit.referenceImages')}
    <span class="ref-counter">({referenceMedias.length} / {refMax})</span>
  </h2>
  <div class="ref-row">
    <div class="ref-dropzone">
      <ReferenceImageDropzone
        bind:referenceImages
        bind:referenceMedias
        maxHeight={180}
        showDeleteButton={false}
        itemDeletable={true}
      />
    </div>
    <div class="ref-roster">
      <RosterPortraitPicker on:pick={onRosterPick} />
    </div>
  </div>
  {/if}

  <div class="hbox gap-5 mt-4">
    {#if uiType == 'gpt-image-1' || uiType == 'gpt-image-1.5'}
      <select class="select h-8 p-0 w-64" bind:value={sizeText}>
        <option value="1024x1024">{$_('generator.square')}</option>
        <option value="1536x1024">{$_('generator.landscape')}</option>
        <option value="1024x1536">{$_('generator.portrait')}</option>
      </select>
      <select class="select h-8 p-0" bind:value={background}>
        <option value="opaque">{$_('generator.normalBackground')}</option>
        <option value="transparent">{$_('generator.transparentBackground')}</option>
      </select>
    {:else}
      <ImageSizeControls {model} bind:width bind:height bind:batchCount bind:aspectRatio={nanoBananaAspectRatio} />
    {/if}
    <div class="auto-size-group">
      <button class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 auto-size-button" on:click={autoSizeFromFrame}>
        {$_('generator.autoSizeFromFrame')}
      </button>
      <label class="auto-size-base-label">
        base
        <input type="number" class="auto-size-base-input" bind:value={autoSizeBase} min={256} max={4096} step={128} />
      </label>
    </div>
  </div>

  {#if $onlineAccount != null}   <!-- onMountの時点で明らかだがsvelteでは!が使えない -->
  <div class="flex flex-row gap-5 w-full items-center my-4 ">
    <button disabled={busy || $onlineAccount.feathral < 1} class="bg-primary-500 text-white hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-900 generate-button" on:click={generate}>
      <div class="flex justify-center items-center h-6">
        {#if busy}
          <ProgressRadial stroke={220} meter="stroke-success-200" track="stroke-success-400" width="w-4"/>
        {:else}
          {$_('generator.generate')}
          <FeathralCost showsLabel={false} cost={estimatedCost} />
        {/if}
        </div>
    </button>
    {#if $onlineAccount.feathral < 1}
    <div class="warning">{$_('generator.notEnoughFeathral')}</div>
    {/if}

    <ProgressBar label="Progress Bar" value={progress} max={1} />
  </div>
  {/if}
  <Gallery columnWidth={220} bind:items={gallery} on:commit={onChooseImage} bind:refered={refered}/>
  {:else}
    <SignInPromptInline message={$_('generator.pleaseSignIn')} />
  {/if}
</div>

<style>
  .drawer-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin: 16px;
  }
  textarea {
    align-self: stretch;
  }
  .generate-button {
    width: 160px;
  }
  .warning {
    color: #d22;
  }
  h2 {
    font-family: '源暎エムゴ';
    font-size: 18px;
    display: flex;
    align-items: center;
    margin-top: 8px;
  }
  .mode-header-row {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
  }
  .textarea-container {
    position: relative;
    width: 100%;
  }
  .icon-container {
    position: absolute;
    right: 16px;
    top: -30px;
  }
  .icon-container img {
    width: 24px;
    height: 24px;
  }
  .ref-counter {
    font-family: '源暎アンチック';
    font-size: 12px;
    margin-left: 8px;
    color: rgb(var(--color-surface-600));
  }

  .ref-row {
    display: flex;
    gap: 8px;
    width: 100%;
  }

  .ref-dropzone {
    flex: 1;
    min-width: 0;
  }

  .ref-roster {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    max-height: 180px;
  }

  .auto-size-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
  }

  .auto-size-button {
    white-space: nowrap;
    flex-shrink: 0;
    height: 32px;
    padding: 0 12px;
    font-size: 14px;
    border-radius: 4px;
  }

  .auto-size-base-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: rgb(var(--color-surface-600));
  }

  .auto-size-base-input {
    width: 64px;
    height: 24px;
    font-size: 12px;
    padding: 0 4px;
    border: 1px solid rgb(var(--color-surface-400));
    border-radius: 4px;
    background: transparent;
    color: inherit;
  }
</style>
