<script lang="ts">
  import { onMount } from "svelte";
  import { buildRenderer, Renderer, type Book } from "manga-renderer";
  import AutoSizeCanvas from "../utils/AutoSizeCanvas.svelte";
  import leftIcon from "../assets/viewer/left.png";
  import rightIcon from "../assets/viewer/right.png";
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import NumberEdit from '../utils/NumberEdit.svelte';

  export let book: Book;

  let canvas: HTMLCanvasElement;
  let renderer: Renderer;
  let pageIndex = 1;
  let min = 1;
  let max = 4;

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

  function handleLeftClick() {
    next();
  }

  function handleRightClick() {
    prev();
  }

  function onResize(e: CustomEvent) {
    canvas = canvas;
  }

  onMount(() => {
    max = book.pages.length;
    pageIndex = 1;
  });

  $: onCanvasUpdate(pageIndex, canvas);
  function onCanvasUpdate(pageIndex: number, canvas: HTMLCanvasElement) {
    console.log("onCanvasUpdate:A");
    if (!book) return;
    if (!canvas) return;
    console.log("onCanvasUpdate:B");
    renderer = buildRenderer(canvas, book, pageIndex-1, 1);
    renderer.focusToPage(0, 0.98);
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
