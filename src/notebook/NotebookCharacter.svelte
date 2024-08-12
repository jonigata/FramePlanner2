<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Character } from './notebook';
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import AutoSizeTextarea from './AutoSizeTextarea.svelte';
  import bellIcon from '../assets/bell.png';

  import trashIcon from '../assets/trash.png'

  const dispatch = createEventDispatcher();

  export let character: Character;

  function portrait(c: Character) {
    dispatch('portrait', c);
  }
</script>

<div class="character">
  <div class="flex flex-col">
    <div class="flex flex-row gap-8 items-center">
      <span class="character-name">{character.name}</span> 
      <img class="trash" src={trashIcon} alt="削除"/>
    </div>
    <div class="flex flex-row gap-1">
      <div class="portrait flex justify-center items-center">
        {#if character.portrait === 'loading'}
          <div class="waiting">
            <ProgressRadial stroke={100} width="w-4"/>
          </div>
        {:else if character.portrait}
          <img src={character.portrait.src} alt="見た目"/>
        {:else}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <img class="no-portrait" src={bellIcon} alt="見た目" on:click={() => portrait(character)}/>
        {/if}
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
  }
  .character-name {
    font-size: 16px;
    font-weight: 700;
    font-family: '源暎アンチック';
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

</style>