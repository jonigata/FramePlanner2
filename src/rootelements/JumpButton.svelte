<script lang="ts">
  import { toolTip } from '../utils/passiveToolTipStore';
  import sliderIcon from '../assets/horizontal.webp';
  import { _ } from 'svelte-i18n';
  import { mainBook, bookOperators, viewport } from '../bookeditor/workspaceStore';
  import { RangeSlider } from '@skeletonlabs/skeleton';
  import { onMount, onDestroy } from 'svelte';
  
  let showSlider = false;
  let sliderValue = 1;
  let lastAutoValue = 1;
  let isUpdatingFromViewport = false;
  
  $: maxValue = $mainBook ? $mainBook.pages.length : 1;
  $: isRightToLeft = $mainBook?.direction === "right-to-left";
  
  // Subscribe to viewport changes
  let unsubscribe: (() => void) | null = null;
  
  onMount(() => {
    // Subscribe to viewport changes to update slider
    unsubscribe = viewport.subscribe(($viewport) => {
      if ($viewport && $mainBook && $bookOperators && !isUpdatingFromViewport) {
        updateSliderFromViewport();
      }
    });
  });
  
  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });
  
  function updateSliderFromViewport() {
    try {
      const currentPage = $bookOperators!.getFocusedPage();
      const pageIndex = $mainBook!.pages.indexOf(currentPage);
      if (pageIndex >= 0) {
        let autoValue: number;
        if (isRightToLeft) {
          // Right-to-left: first page = max value, last page = 1
          autoValue = maxValue - pageIndex;
        } else {
          // Left-to-right: first page = 1, last page = max value
          autoValue = pageIndex + 1;
        }
        
        // Only update if this is different from current value
        if (autoValue !== sliderValue) {
          sliderValue = autoValue;
          lastAutoValue = autoValue;
        }
      }
    } catch (e) {
      // getFocusedPage might fail during initialization
    }
  }
  
  // React to slider value changes (user input)
  $: onSliderChange(sliderValue);
  
  function onSliderChange(value: number) {
    if (!$bookOperators || !$mainBook) return;
    
    // Convert slider value to page index based on direction
    let pageIndex: number;
    if (isRightToLeft) {
      // Right-to-left: slider 1 = last page, slider max = first page
      pageIndex = maxValue - Math.round(value);
    } else {
      // Left-to-right: slider 1 = first page, slider max = last page
      pageIndex = Math.round(value) - 1;
    }
    
    if (pageIndex < 0 || pageIndex >= $mainBook.pages.length) return;
    
    // Only jump if this is different from the auto-tracked value
    if (value !== lastAutoValue) {
      isUpdatingFromViewport = true;
      $bookOperators.focusToPage(pageIndex, 1, true); // keepScale = true
      lastAutoValue = value;
      // Reset flag after a short delay to allow viewport update
      setTimeout(() => {
        isUpdatingFromViewport = false;
      }, 100);
    }
  }
  
  function toggle() {
    showSlider = !showSlider;
  }
</script>

{#if $mainBook && $mainBook.pages.length > 1}
  <button class="variant-ghost-surface text-white hover:bg-slate-100 focus:bg-slate-100 active:bg-slate-200 open-button hbox" on:click={toggle}
    use:toolTip={showSlider ? 'スライダーを隠す' : 'スライダーを表示'}>
    <img src={sliderIcon} alt="slider"/>
  </button>

  {#if showSlider}
    <div class="slider-container">
      <div class="flex justify-between text-xs text-gray-700 mb-2">
        {#if isRightToLeft}
          <div>{maxValue}</div>
          <div>1</div>
        {:else}
          <div>1</div>
          <div>{maxValue}</div>
        {/if}
      </div>
      <RangeSlider 
        name="page-slider" 
        bind:value={sliderValue} 
        min={1} 
        max={maxValue} 
        step={1} 
        ticked={true}
      />
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
    right: 160px;
    @media (max-width: 640px), (max-height: 800px) {
      right: 100px;
      width: 60px;
      height: 60px;
      bottom: 10px;
    }
  }
  
  img {
    width: 80%;
    height: 80%;
  }
  
  .slider-container {
    position: absolute;
    bottom: 20px;
    right: 260px;
    width: 250px;
    background-color: rgba(240, 240, 240, 0.95);
    border-radius: 8px;
    padding: 15px 20px;
    pointer-events: auto;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    @media (max-width: 640px), (max-height: 800px) {
      right: 170px;
      width: 200px;
      bottom: 10px;
      padding: 10px 15px;
    }
  }
</style>