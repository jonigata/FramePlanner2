<script lang="ts">
  import { onMount } from "svelte";
  import { readEnvelope, buildRenderer, Renderer, listFonts, isLocalFont, localFonts, loadGoogleFontForCanvas, type Book } from "manga-renderer";
  import AutoSizeCanvas from "../utils/AutoSizeCanvas.svelte";
  import leftIcon from "../assets/viewer/left.png";
  import rightIcon from "../assets/viewer/right.png";
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import NumberEdit from '../utils/NumberEdit.svelte';
  import { loading } from '../utils/loadingStore';

  let canvas: HTMLCanvasElement;
  let renderer: Renderer;
  let pageIndex = 1;
  let min = 1;
  let max = 4;
  let book: Book;

  $: onPageIndexChange(pageIndex);
  function onPageIndexChange(pageIndex: number) {
    if (!book) return;
    renderer = buildRenderer(canvas, book, pageIndex-1, 1);
    renderer.focusToPage(0, 0.98);
  }

  function onResize(e: CustomEvent) {
    // if (!layeredCanvas || !$viewport) { return; }
    // $viewport.dirty = true;
    // layeredCanvas.redraw();
  }

  function prev() {
    if (pageIndex > min) {
      pageIndex--;
    }
  }

  function next() {
    if (pageIndex < max) {
      pageIndex++;
    }
  }

  async function loadEnvelope(envelope: string) {
    try {
      const response = await fetch(`https://api004.backblazeb2.com/file/FramePlannerPublished/published/${envelope}.envelope`);
      if (!response.ok) {
        throw new Error('Failed to fetch manga.envelope');
      }
      const fileContent = await response.blob();
      const book = await readEnvelope(fileContent);
      return book;
    } catch (error) {
      console.error('Error loading file:', error);
    }
  }

  onMount(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    console.log("URLParams", urlParams);
    const envelope = urlParams.get('envelope');
    if (envelope === null) {
      console.error("envelope not found");
      return;
    }

    $loading = true;
    book = (await loadEnvelope(envelope))!;
    max = book.pages.length;

    const fonts = listFonts(book);
    console.log(fonts);
    for (const font of fonts) {
      const {family, weight} = font

      if (isLocalFont(family)) {
        console.log("loading local font", family, weight);
        const localFile = localFonts[family];
        const url = new URL(`../assets/fonts/${localFile}.woff2`, import.meta.url).href;
        console.log(url);
        const font = new FontFace(family, `url(${url}) format('woff2')`, { style: 'normal', weight });
        document.fonts.add(font);
        await font.load();
      } else {
        console.log("loading google font", family, weight);
        await loadGoogleFontForCanvas(family, [weight]);
      }
    }

    renderer = buildRenderer(canvas, book, 0, 1);
    console.log(renderer);
    $loading = false;
    
    renderer.focusToPage(0, 0.98);
  });

  function handleLeftClick() {
    next();
  }

  function handleRightClick() {
    prev();
  }
</script>

<div class="w-full h-full flex flex-col">
  <div class="w-full h-full relative flex-grow">
    <AutoSizeCanvas bind:canvas={canvas} on:resize={onResize}>
      <!--
        {#if bubbleLayer?.defaultBubble}
        <p style={getFontStyle2(bubbleLayer.defaultBubble.fontFamily, "400")}>あ</p> <!- 事前読み込み、ローカルフォントだと多分エラー出る ->
        {/if}
      -->
    </AutoSizeCanvas>
    <div class="absolute inset-0 flex">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="w-1/2 h-full" on:click={handleLeftClick}></div>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="w-1/2 h-full" on:click={handleRightClick}></div>
    </div>
    {#if pageIndex < max}
    <button class="absolute left-1 top-1/2 transform -translate-y-1/2 bg-gray-800 bg-opacity-50 text-white p-2 rounded-lg" on:click={next}>
      <img src={leftIcon} alt="left"/>
    </button>
    {/if}
    {#if pageIndex > min}
    <button class="absolute right-1 top-1/2 transform -translate-y-1/2 bg-gray-800 bg-opacity-50 text-white p-2 rounded-lg" on:click={prev}>
      <img src={rightIcon} alt="right"/>
    </button>
    {/if}
  </div>
  <div class="pager w-full p-4 flex flex-row gap-2">
    <div class="font-bold">ページ</div>
    <div class="grow" dir="rtl">
      <RangeSlider name="batch-count" bind:value={pageIndex} min={min} max={max} step={1}/>
    </div>
    <div class="w-12 mb-0.5" dir="rtl">
      <NumberEdit bind:value={pageIndex} min={min} max={max}/>
    </div>  
    / {max}
  </div>
</div>
