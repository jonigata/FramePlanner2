<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { CharacterLocal } from '../lib/book/book';
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import AutoSizeTextarea from './AutoSizeTextarea.svelte';
	import ColorPickerLabel from '../utils/colorpicker/ColorPickerLabel.svelte';
  import MediaFrame from "../gallery/MediaFrame.svelte";

  import bellIcon from '../assets/bell.webp';
  import trashIcon from '../assets/trash.webp'

  const dispatch = createEventDispatcher();

  export let character: CharacterLocal;

  $: media = character.portrait != 'loading' ? character.portrait : null;

  function portrait() {
    dispatch('portrait', character);
  }

  function remove() {
    dispatch('remove', character);
  }

  function register() {
    dispatch('register', character);
  }
</script>

<div class="character">
  <div class="flex flex-col">
    <div class="flex flex-row gap-4 items-center mb-2">
      <input type="text" bind:value={character.name} class="input character-name"/>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img class="trash" src={trashIcon} alt="削除" on:click={remove}/>
      <div class="color-label">
        <ColorPickerLabel bind:hex={character.themeColor}/>
      </div>
    </div>
    <div class="flex flex-row gap-1">
      <div class="flex flex-col gap-2">
        <div class="portrait flex justify-center items-center">
          {#if character.portrait === 'loading'}
            <div class="waiting">
              <ProgressRadial stroke={100} width="w-4"/>
            </div>
          {:else if media}
            <MediaFrame 
              media={media}
            />
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
            <img class="portrait-bell" src={bellIcon} alt="見た目" on:click={portrait}/>
          {:else}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
            <img class="no-portrait" src={bellIcon} alt="見た目" on:click={portrait}/>
          {/if}
        </div>
        <button class="btn btn-sm bg-secondary-400" on:click={register}>キャラ名簿に登録</button>
      </div>
      <div class="flex flex-col flex-grow gap-1">
        <AutoSizeTextarea bind:value={character.personality} minHeight={24}/>
        <AutoSizeTextarea bind:value={character.appearance} minHeight={24}/>
      </div>
    </div>
  </div>
</div>

<style>
  .portrait {
    width: 144px;
    height: 144px;
    border-width: 1px;
    border-style: solid;
    border-color: black;
    position: relative;
  }
  .portrait-bell {
    width: 24px;
    height: 24px;
    position: absolute;
    right: 2px;
    bottom: 2px;
  }
  .character-name {
    font-size: 16px;
    font-weight: 700;
    font-family: '源暎アンチック';
    border-radius: 2px;
    padding-left: 8px;
    padding-right: 8px;
    width: 240px;
  }
  .trash {
    width: 20px;
    height: 20px;
  }
  .waiting {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .no-portrait {
    width: 64px;
    height: 64px;
  }
  .color-label {
    width: 30px;
    height: 20px;
    margin-left: 4px;
    margin-right: 4px;
  }
</style>