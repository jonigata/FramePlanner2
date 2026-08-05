<script lang="ts">
  import { toolTip } from '../utils/passiveToolTipStore';
  import sliderIcon from '../assets/horizontal.webp';
  import { _ } from 'svelte-i18n';
  import { mainBook, bookOperators, viewport } from '../bookeditor/workspaceStore';
  import { RangeSlider, RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
  import { createPreference } from '../preferences';
  import { onMount, onDestroy } from 'svelte';

  type JumpMode = "grid" | "slider";
  const modePreference = createPreference<JumpMode>("tweakUi", "pageJumpMode");

  let showPanel = false;
  let mode: JumpMode = "grid";
  let modeLoaded = false;
  let currentPageIndex = 0;
  let sliderValue = 1;
  let dragging = false;
  let panelElement: HTMLDivElement;
  let buttonElement: HTMLButtonElement;

  $: pageCount = $mainBook ? $mainBook.pages.length : 0;
  $: columns = Math.min(pageCount, 10);
  $: isRightToLeft = $mainBook?.direction === "right-to-left";

  // Subscribe to viewport changes
  let unsubscribe: (() => void) | null = null;

  onMount(async () => {
    unsubscribe = viewport.subscribe(($viewport) => {
      if ($viewport && $mainBook && $bookOperators) {
        updateCurrentPageFromViewport();
      }
    });
    mode = await modePreference.getOrDefault("grid");
    modeLoaded = true;
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  function updateCurrentPageFromViewport() {
    try {
      const currentPage = $bookOperators!.getFocusedPage();
      const pageIndex = $mainBook!.pages.indexOf(currentPage);
      if (0 <= pageIndex) {
        currentPageIndex = pageIndex;
      }
    } catch (e) {
      // getFocusedPage might fail during initialization
    }
  }

  function jumpToPage(pageIndex: number) {
    if (!$bookOperators || !$mainBook) return;
    if (pageIndex < 0 || pageCount <= pageIndex) return;
    if (pageIndex === currentPageIndex) return;
    currentPageIndex = pageIndex;
    $bookOperators.focusToPage(pageIndex, 1, true); // keepScale = true
  }

  // Keep the slider in sync with the focused page
  $: syncSlider(currentPageIndex, isRightToLeft, pageCount);

  function syncSlider(pageIndex: number, rtl: boolean, count: number) {
    const value = rtl ? count - pageIndex : pageIndex + 1;
    if (value !== sliderValue) {
      sliderValue = value;
    }
  }

  // React to slider value changes (user input)
  $: onSliderChange(sliderValue);

  function onSliderChange(value: number) {
    const pageIndex = isRightToLeft ? pageCount - Math.round(value) : Math.round(value) - 1;
    jumpToPage(pageIndex);
  }

  function pageIndexFromEvent(e: PointerEvent): number | null {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el?.closest('[data-page-index]');
    if (!cell) return null;
    return parseInt(cell.getAttribute('data-page-index')!, 10);
  }

  function onGridPointerDown(e: PointerEvent) {
    const index = pageIndexFromEvent(e);
    if (index == null) return;
    dragging = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    jumpToPage(index);
  }

  function onGridPointerMove(e: PointerEvent) {
    if (!dragging) return;
    const index = pageIndexFromEvent(e);
    if (index != null) {
      jumpToPage(index);
    }
  }

  function onGridPointerUp(e: PointerEvent) {
    dragging = false;
  }

  function toggle() {
    showPanel = !showPanel;
  }

  $: if (modeLoaded) {
    modePreference.set(mode);
  }

  function onWindowPointerDown(e: PointerEvent) {
    if (!showPanel) return;
    const target = e.target as Node;
    if (panelElement?.contains(target) || buttonElement?.contains(target)) return;
    showPanel = false;
  }
</script>

<svelte:window on:pointerdown|capture={onWindowPointerDown} />

{#if $mainBook && $mainBook.pages.length > 1}
  <button bind:this={buttonElement} class="variant-ghost-surface text-white hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 open-button hbox" on:click={toggle}
    use:toolTip={showPanel ? 'ページジャンプを隠す' : 'ページジャンプを表示'}>
    <img src={sliderIcon} alt="page jump"/>
  </button>

  {#if showPanel}
    <div class="panel" bind:this={panelElement}>
      <div class="mode-toggle">
        <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
          <RadioItem bind:group={mode} name="jump-mode" value={"grid"}><span class="radio-text">ページ表</span></RadioItem>
          <RadioItem bind:group={mode} name="jump-mode" value={"slider"}><span class="radio-text">スライダー</span></RadioItem>
        </RadioGroup>
      </div>

      {#if mode === "grid"}
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="page-grid"
          class:rtl={isRightToLeft}
          style="grid-template-columns: repeat({columns}, 1fr);"
          on:pointerdown={onGridPointerDown}
          on:pointermove={onGridPointerMove}
          on:pointerup={onGridPointerUp}
          on:pointercancel={onGridPointerUp}
        >
          {#each { length: pageCount } as _unused, i}
            <div class="page-cell" class:current={i === currentPageIndex} data-page-index={i}>
              {i + 1}
            </div>
          {/each}
        </div>
      {:else}
        <div class="slider-area">
          <div class="flex justify-between text-xs text-gray-700 mb-2">
            {#if isRightToLeft}
              <div>{pageCount}</div>
              <div>1</div>
            {:else}
              <div>1</div>
              <div>{pageCount}</div>
            {/if}
          </div>
          <RangeSlider
            name="page-slider"
            bind:value={sliderValue}
            min={1}
            max={pageCount}
            step={1}
            ticked={true}
          />
        </div>
      {/if}
    </div>
  {/if}
{/if}

<style>
  .open-button {
    pointer-events: auto;
    position: absolute;
    width: 80px;
    height: 80px;
    bottom: 20px;
    right: 320px;
    @media (max-width: 640px), (max-height: 800px) {
      right: 210px;
      width: 60px;
      height: 60px;
      bottom: 10px;
    }
  }

  img {
    width: 80%;
    height: 80%;
  }

  .panel {
    position: absolute;
    bottom: 20px;
    right: 420px;
    background-color: rgba(240, 240, 240, 0.95);
    border-radius: 8px;
    padding: 12px;
    pointer-events: auto;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    @media (max-width: 640px), (max-height: 800px) {
      right: 310px;
      bottom: 10px;
      padding: 8px;
    }
  }

  .mode-toggle {
    display: flex;
    justify-content: center;
    margin-bottom: 8px;
  }

  .radio-text {
    font-size: 12px;
  }

  .page-grid {
    display: grid;
    gap: 4px;
    touch-action: none;
    user-select: none;
    cursor: pointer;
  }

  .page-grid.rtl {
    direction: rtl;
  }

  .page-cell {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: #444;
    background-color: white;
    border: 1px solid #bbb;
    border-radius: 4px;
    @media (max-width: 640px), (max-height: 800px) {
      width: 22px;
      height: 22px;
      font-size: 10px;
    }
  }

  .page-cell.current {
    background-color: #3b82f6;
    border-color: #2563eb;
    color: white;
  }

  .slider-area {
    width: 220px;
    padding: 0 4px;
    @media (max-width: 640px), (max-height: 800px) {
      width: 180px;
    }
  }
</style>
