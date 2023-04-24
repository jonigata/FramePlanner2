<script lang="ts">
  import { onMount } from 'svelte';
  import { Drawer, drawerStore, type DrawerSettings } from '@skeletonlabs/skeleton';
  import { SlideToggle } from '@skeletonlabs/skeleton';
  import HistoryStorage from './HistoryStorage.svelte';
  import WebFontList from './WebFontList.svelte';
  import { fontChooserOpened, chosenFont } from './fontStore';
  import trash from './assets/trash.png';

  let searchOptions = { filterString: '', mincho: true, gothic: true, normal: true, bold: true };
  let drawerPage = 0;
  let fontList = null;
  let localFontName;
  let localFonts = [];
  let historyStorage;

  function setLocalFont() {
    drawerStore.close();
    if (localFontName) {
      console.log(localFontName);
      chosenFont.set({ fontFamily: localFontName, fontWeight: '400' })
      addHistory(localFontName);
    }
  }

  function onChangeFont(event) {
    drawerStore.close();
    chosenFont.set(event.detail);
  }

  function addHistory(fontFamily) {
    historyStorage.add(fontFamily);
    localFonts.push(fontFamily);
  }

  function removeFromHistory(fontFamily) {
    historyStorage.remove(fontFamily);
    localFonts = localFonts.filter((f) => f !== fontFamily);
  }

  $:onChangeSearchOptions(searchOptions);
  function onChangeSearchOptions(options) {
    if (fontList) {
      fontList.searchOptions = options;
    }
  }

  drawerStore.subscribe((drawerSettings) => {
    if (!drawerSettings.open) {
      $fontChooserOpened = false;
    }
  });

  function allOff() {
    searchOptions.mincho = false;
    searchOptions.gothic = false;
    searchOptions.normal = false;
    searchOptions.bold = false;
  }

  $:chooseFont($fontChooserOpened);
  function chooseFont(f) {
    if (f) {
      const settings: DrawerSettings = {
        position: 'right',
        width: 'w-[720px]',
        id: 'font'
      };
      drawerStore.open(settings);
    }
  }

  onMount(async () => {
    await historyStorage.isReady();
    historyStorage.getAll().onsuccess = (e) => {
      localFonts = e.target.result;
    };
  });

</script>

<Drawer>
  <div class="drawer-content">
    {#if drawerPage === 0}
    <button class="drawer-page-right px-2 bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 download-button" on:click={() => drawerPage = 1}>ローカル &gt;</button>
    {:else}
    <button class="drawer-page-left px-2 bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 download-button" on:click={() => drawerPage = 0}>&lt; Webフォント</button>
    {/if}
    <h1>フォント</h1>
    {#if drawerPage === 0}
    <div class="hbox gap my-2">
      <SlideToggle name="slider-label" size="sm" bind:checked={searchOptions.mincho}></SlideToggle>明
      <SlideToggle name="slider-label" size="sm" bind:checked={searchOptions.gothic}></SlideToggle>ゴ
      <SlideToggle name="slider-label" size="sm" bind:checked={searchOptions.normal}></SlideToggle>N
      <SlideToggle name="slider-label" size="sm" bind:checked={searchOptions.bold}></SlideToggle>B
      <button class="px-2 bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 download-button" on:click={allOff}>すべてオフ</button>
    </div>
    <hr/>
    <WebFontList on:choose={onChangeFont} bind:this={fontList}/>
    {/if}
    {#if drawerPage === 1}
    <div class="custom-font-panel">
      <input type="text" class="input px-2" bind:value={localFontName} placeholder="フォント名" />
      <button class="px-2 bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 download-button" on:click={setLocalFont}>採用</button>
    </div>
    {/if}
    {#each localFonts as font}
        <div class="font-sample hbox" style="font-family: '{font}'">
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <span on:click={e=>onChangeFont({detail:{fontWeight:"400",fontFamily:font}})}>{font} 今日はいい天気ですね</span>
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <img src={trash} width="20" height="20" alt="trash" on:click={() => removeFromHistory(font)}/>
        </div>
    {/each}
  </div>
</Drawer>

<HistoryStorage bind:this={historyStorage}/>

