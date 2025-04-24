<script lang="ts">
  import type { ImagingMode } from '$protocolTypes/imagingTypes';
  import { modeOptions } from '../utils/feathralImaging';
  import { onMount } from 'svelte';
  import { createPreference } from '../preferences';
  import FeathralCost from '../utils/FeathralCost.svelte';

  export let mode: ImagingMode;
  export let comment: string = '';
  let internalMode: ImagingMode;

  const preference = createPreference<ImagingMode>("imaging", "mode");

  onMount(async () => {
    internalMode = await preference.getOrDefault(mode);
  });

  $: if (internalMode !== undefined) {
    mode = internalMode;
    preference.set(internalMode).then(() => console.log("save done", internalMode));
  }
  
  // ドロップダウンの開閉状態
  let isOpen = false;
  
  // 選択されたモードのコスト取得
  $: selectedMode = modeOptions.find(option => option.value === internalMode);
  
  // ドロップダウンの開閉を切り替える
  function toggleDropdown() {
    isOpen = !isOpen;
  }
  
  // 選択処理
  function selectOption(option: {value: ImagingMode, name: string, cost: number}) {
    internalMode = option.value;
    isOpen = false;
  }
  
  // 外部クリックでドロップダウンを閉じる
  function handleClickOutside(event: MouseEvent) {
    if (isOpen) {
      isOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="vbox left gap-2 mode">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="custom-select-container" on:click|stopPropagation>
    <div class="select-display" on:click={toggleDropdown}>
      {#if selectedMode}
        <span>{selectedMode.name}</span>
        <FeathralCost cost={selectedMode.cost} showsLabel={false}/>
      {/if}
    </div>
    
    {#if isOpen}
      <div class="options-container">
        {#each modeOptions as option}
          <div
            class="option-item"
            class:selected={option.value === internalMode}
            on:click={() => selectOption(option)}
          >
            <span>{option.name}</span>
            <FeathralCost cost={option.cost} showsLabel={false}/>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  {#if comment}
    <div class="comment">{comment}</div>
  {/if}
</div>

<style>
  .custom-select-container {
    position: relative;
    display: inline-block;
    width: 300px;
    font-family: '源暎アンチック';
  }
  
  .select-display {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border: 2px solid var(--color-surface-400, #94a3b8);
    border-radius: 0.25rem;
    background-color: white;
    cursor: pointer;
    position: relative;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .select-display:hover {
    background-color: var(--color-surface-300, #cbd5e1);
    border-color: var(--color-primary-500, #3b82f6);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  }
  
  .select-display::after {
    content: "";
    width: 0.5rem;
    height: 0.5rem;
    border-right: 2px solid var(--color-surface-600, #475569);
    border-bottom: 2px solid var(--color-surface-600, #475569);
    position: absolute;
    right: 0.75rem;
    top: calc(50% - 0.4rem);
    transform: rotate(45deg);
    pointer-events: none;
    transition: transform 0.2s ease;
  }
  
  .custom-select-container:hover .select-display::after {
    border-color: var(--color-primary-500, #3b82f6);
  }
  
  .options-container {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    max-height: fit-content;
    overflow: hidden;
    background-color: white;
    border: 1px solid var(--color-surface-400, #94a3b8);
    border-radius: 0.25rem;
    z-index: 10;
    margin-top: 0.25rem;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }
  
  .option-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  
  .option-item:hover {
    background-color: #e0f2fe; /* 薄い水色 */
  }
  
  /* 選択中の項目のスタイル - ホバーされていない時 */
  .option-item.selected {
    background-color: #bae6fd; /* より濃い水色で選択中を表示 */
    font-weight: 500;
  }
  
  /* 選択中の項目のホバー時のスタイル - ホバーが優先されるように */
  .option-item.selected:hover {
    background-color: #e0f2fe; /* ホバー時は他と同じ薄い水色に */
  }
  
  .comment {
    font-family: '源暎アンチック';
    font-size: 12px;
    margin-top: -8px;
    width: 100%;
    text-align: center;
  }
</style>

