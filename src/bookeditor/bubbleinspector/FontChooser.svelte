<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { _ } from 'svelte-i18n';
  import Drawer from '../../utils/Drawer.svelte'
  import { SlideToggle } from '@skeletonlabs/skeleton';
  import HistoryStorage from './HistoryStorage.svelte';
  import WebFontList from './WebFontList.svelte';
  import { type SearchOptions, fontChooserOpen, chosenFont } from './fontStore';
  import {
    isLocalFontAccessSupported,
    queryInstalledFonts,
    loadInstalledFontGroup,
    declareLocalFont,
    verifyCanvasFontAvailable,
    type InstalledFontGroup,
  } from '../localFonts';
  import trash from '../../assets/trash.webp';

  let searchOptions: SearchOptions = { filterString: '', mincho: true, gothic: true, normal: true, bold: true };
  let drawerPage = 0;
  let localFontName = '';
  let localFonts: string[] = [];
  let historyStorage: HistoryStorage;

  // Local Font Access API
  const localFontAccessSupported = isLocalFontAccessSupported();
  let installedFonts: InstalledFontGroup[] = [];
  let installedFontsLoading = false;
  let installedFontsError = '';
  let installedFontFilter = '';
  let installedListShown = false;

  // テキスト入力名のライブ検証
  let typedNameStatus: 'idle' | 'verified' | 'unverified' = 'idle';
  let verifyTimer: ReturnType<typeof setTimeout> | null = null;

  $: scheduleVerify(localFontName);

  function scheduleVerify(name: string) {
    if (verifyTimer) {
      clearTimeout(verifyTimer);
      verifyTimer = null;
    }
    const trimmed = name?.trim() ?? '';
    if (!trimmed) {
      typedNameStatus = 'idle';
      return;
    }
    verifyTimer = setTimeout(async () => {
      declareLocalFont(trimmed);
      const ok = await verifyCanvasFontAvailable(trimmed, '400', 6, 40);
      if (trimmed === localFontName.trim()) {
        typedNameStatus = ok ? 'verified' : 'unverified';
      }
    }, 250);
  }

  function setLocalFont() {
    const trimmed = localFontName.trim();
    if (!trimmed) return;
    declareLocalFont(trimmed);
    chosenFont.set({ fontFamily: trimmed, fontWeight: '400' });
    addHistory(trimmed);
    $fontChooserOpen = false;
  }

  async function browseInstalled() {
    if (!localFontAccessSupported) return;
    installedFontsLoading = true;
    installedFontsError = '';
    installedListShown = true;
    try {
      installedFonts = await queryInstalledFonts();
    } catch (e: any) {
      console.error(e);
      installedFontsError = e?.message ?? String(e);
    } finally {
      installedFontsLoading = false;
    }
  }

  async function selectInstalled(g: InstalledFontGroup, mouseEvent: MouseEvent) {
    try {
      await loadInstalledFontGroup(g);
      addHistory(g.family);
      chosenFont.set({ fontFamily: g.family, fontWeight: '400' });
      if (!mouseEvent.ctrlKey) {
        $fontChooserOpen = false;
      }
    } catch (e) {
      console.error(e);
    }
  }

  function onChangeFont(event: { detail: { mouseEvent: MouseEvent, font: { family: string, variants: string[] } } }) {
    const font = event.detail.font;
    chosenFont.set({ fontFamily: font.family, fontWeight: font.variants[0] });
    if (!event.detail.mouseEvent.ctrlKey) {
      $fontChooserOpen = false;
    }
  }

  function onClickHistory(event: MouseEvent, font: string) {
    declareLocalFont(font);
    onChangeFont({ detail: { mouseEvent: event, font: { family: font, variants: ['400'] } } });
  }

  function addHistory(fontFamily: string) {
    historyStorage.add(fontFamily);
    if (!localFonts.includes(fontFamily)) {
      localFonts = [...localFonts, fontFamily];
    }
  }

  function removeFromHistory(fontFamily: string) {
    historyStorage.remove(fontFamily);
    localFonts = localFonts.filter((f) => f !== fontFamily);
  }


  function allOff() {
    searchOptions.mincho = false;
    searchOptions.gothic = false;
    searchOptions.normal = false;
    searchOptions.bold = false;
  }

  $: filteredInstalled = installedFontFilter.trim()
    ? installedFonts.filter(g => g.family.toLowerCase().includes(installedFontFilter.trim().toLowerCase()))
    : installedFonts;

  onMount(async () => {
    await historyStorage.isReady();
    historyStorage.getAll().onsuccess = (e: Event) => {
      localFonts = (e.target as IDBRequest<string[]>).result;
      // 履歴のフォント名は HTML プレビューでも canvas でも解決できるよう先に declare しておく
      for (const f of localFonts) declareLocalFont(f);
    };
  });

  onDestroy(() => {
    if (verifyTimer) {
      clearTimeout(verifyTimer);
      verifyTimer = null;
    }
  });

</script>

<div class="drawer-outer">
  <Drawer open={$fontChooserOpen} placement="right" size="720px" on:clickAway={() => $fontChooserOpen = false}>
  <div class="drawer-content">
    <button
      class="drawer-page-toggle px-2 bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900"
      on:click={() => drawerPage = drawerPage === 0 ? 1 : 0}>
      {drawerPage === 0 ? $_('fontChooser.switchToLocal') : $_('fontChooser.switchToWeb')}
    </button>
    <h1>{$_('fontChooser.title')}</h1>
    <div class="text-xs">{$_('fontChooser.ctrlClickHint')}</div>
    {#if drawerPage === 0}
    <div class="hbox gap my-2">
      <SlideToggle name="slider-label" size="sm" bind:checked={searchOptions.mincho}></SlideToggle>{$_('fontChooser.filterMincho')}
      <SlideToggle name="slider-label" size="sm" bind:checked={searchOptions.gothic}></SlideToggle>{$_('fontChooser.filterGothic')}
      <SlideToggle name="slider-label" size="sm" bind:checked={searchOptions.normal}></SlideToggle>{$_('fontChooser.filterNormal')}
      <SlideToggle name="slider-label" size="sm" bind:checked={searchOptions.bold}></SlideToggle>{$_('fontChooser.filterBold')}
      <button class="px-2 bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900" on:click={allOff}>{$_('fontChooser.allOff')}</button>
    </div>
    <hr/>
    <WebFontList on:choose={onChangeFont} searchOptions={searchOptions}/>
    {/if}
    {#if drawerPage === 1}
    <div class="custom-font-panel">
      <section class="local-section vbox gap stretch-child">
        <div class="section-title">{$_('fontChooser.installedSection')}</div>
        {#if localFontAccessSupported}
          {#if !installedListShown}
            <button class="show-installed-button bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900" on:click={browseInstalled}>
              {$_('fontChooser.showInstalledList')}
            </button>
          {:else}
            <div class="hbox gap">
              <button class="refresh-installed-button px-3 bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900" on:click={browseInstalled}>
                {$_('fontChooser.refreshInstalledList')}
              </button>
              <input class="input px-2 grow" type="text" placeholder={$_('fontChooser.filterPlaceholder')} bind:value={installedFontFilter} />
            </div>
            <div class="text-xs new-font-hint">{$_('fontChooser.newFontHint')}</div>
            {#if installedFontsLoading}
              <div class="text-sm">{$_('fontChooser.loading')}</div>
            {:else if installedFontsError}
              <div class="text-sm text-error-500">{$_('fontChooser.errorPrefix')}{installedFontsError}</div>
            {:else if filteredInstalled.length === 0}
              <div class="text-sm">{$_('fontChooser.noResults')}</div>
            {:else}
              <div class="installed-list">
                {#each filteredInstalled as g (g.family)}
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <!-- svelte-ignore a11y-no-static-element-interactions -->
                  <div class="installed-row hbox" on:click={(e) => selectInstalled(g, e)}>
                    <span class="installed-row-name">{g.family}</span>
                    <span class="installed-row-sample" style="font-family: '{g.family}'">{$_('fontChooser.installedRowSample')}</span>
                  </div>
                {/each}
              </div>
            {/if}
          {/if}
        {:else}
          <div class="text-sm">{$_('fontChooser.apiUnsupported')}</div>
        {/if}
      </section>

      <hr/>

      <section class="local-section vbox gap stretch-child">
        <div class="section-title">{$_('fontChooser.typedSection')}</div>
        <div class="text-xs">
          {$_('fontChooser.typedHint')}<br/>
          {$_('fontChooser.typedExamples')}<code>ラノベPOP v2</code>, <code>Comic Sans MS</code>, <code>Hiragino Kaku Gothic ProN</code>
        </div>
        <div class="hbox gap">
          <input
            type="text"
            class="input px-2 grow"
            bind:value={localFontName}
            placeholder={$_('fontChooser.typedPlaceholder')}
            on:keydown={(e) => { if (e.key === 'Enter') setLocalFont(); }}
          />
          <button class="apply-button px-3 bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900" on:click={setLocalFont}>{$_('fontChooser.apply')}</button>
        </div>
        {#if localFontName.trim()}
          <div class="font-preview" style="font-family: '{localFontName.trim()}'">
            {$_('fontChooser.previewLabel')}{$_('fontChooser.previewSample')}
          </div>
          <div class="font-status text-xs">
            {#if typedNameStatus === 'verified'}
              <span class="text-success-700">{$_('fontChooser.verified')}</span>
            {:else if typedNameStatus === 'unverified'}
              <span class="text-warning-700">{$_('fontChooser.unverified')}</span>
            {:else}
              <span>{$_('fontChooser.verifying')}</span>
            {/if}
          </div>
        {/if}
      </section>

      <hr/>

      <section class="local-section vbox gap stretch-child">
        <div class="section-title">{$_('fontChooser.historySection')}</div>
        {#if localFonts.length === 0}
          <div class="text-xs">{$_('fontChooser.historyEmpty')}</div>
        {/if}
        {#each localFonts as font}
          <div class="font-sample hbox" style="font-family: '{font}'">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <span on:click={(e) => onClickHistory(e, font)}>{font}{$_('fontChooser.historyLocalSuffix')}</span>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
            <img src={trash} width="20" height="20" alt="trash" on:click={() => removeFromHistory(font)}/>
          </div>
        {/each}
      </section>
    </div>
    {/if}
  </div>
  </Drawer>
</div>

<HistoryStorage bind:this={historyStorage}/>

<style>
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
    padding: 8px;
  }
  .drawer-content {
    position: relative;
  }
  .drawer-page-toggle {
    position: absolute;
    right: 16px;
    top: 16px;
    white-space: nowrap;
  }
  .custom-font-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }
  .local-section {
    width: 100%;
  }
  .section-title {
    font-weight: bold;
    font-size: 14px;
  }
  .show-installed-button {
    width: 100%;
    padding: 14px 16px;
    font-size: 16px;
    white-space: nowrap;
    border-radius: 6px;
    font-weight: 600;
  }
  .refresh-installed-button {
    white-space: nowrap;
    flex-shrink: 0;
  }
  .new-font-hint {
    color: rgba(0, 0, 0, 0.55);
    line-height: 1.4;
  }
  .apply-button {
    white-space: nowrap;
    flex-shrink: 0;
  }
  .font-preview {
    font-size: 22px;
    border: 1px solid rgba(0,0,0,0.1);
    padding: 8px 12px;
    background-color: rgba(255,255,255,0.6);
    border-radius: 4px;
  }
  .installed-list {
    max-height: 320px;
    overflow-y: auto;
    border: 1px solid rgba(0,0,0,0.1);
    border-radius: 4px;
    background-color: rgba(255,255,255,0.6);
  }
  .installed-row {
    padding: 6px 10px;
    cursor: pointer;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid rgba(0,0,0,0.05);
  }
  .installed-row:hover {
    background-color: rgba(0,0,0,0.04);
  }
  .installed-row:last-child {
    border-bottom: none;
  }
  .installed-row-name {
    flex: 0 0 220px;
    font-size: 13px;
    color: rgba(0,0,0,0.8);
  }
  .installed-row-sample {
    flex: 1 1 auto;
    font-size: 18px;
  }
  .font-sample {
    font-size: 22px;
    cursor: pointer;
  }
  .font-sample img {
    margin-left: 8px;
    cursor: pointer;
  }
  h1 {
    font-family: '源暎エムゴ';
    font-size: 32px;
    padding-right: 140px;
  }

</style>

