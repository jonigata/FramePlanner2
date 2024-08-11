<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import type { Character } from './notebook';
  import AutoSizeTextarea from './AutoSizeTextarea.svelte';

  import bellIcon from '../assets/bell.png';
  import trashIcon from '../assets/trash.png'

  const dispatch = createEventDispatcher();

  export let value = '';
  export let waiting = false;

  export let characters: Character[] = [
    /*
    { name: 'Alice', personality: 'まぬけ', appearance: 'かわいい' },
    { name: 'Bob', personality: '頭が良い', appearance: 'ふとっている' },
    */
  ];
</script>

<div class="character-container">
  {#if waiting}
    <div class="waiting rounded-corner-token textarea">
      <ProgressRadial stroke={100} width="w-10"/>
    </div>
  {:else if characters.length === 0}
    <div class="h-24 rounded-corner-token textarea">

    </div>
    <div class="icon-container">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img class="advise" src={bellIcon} alt="カイルちゃん考えて！" on:click={() => dispatch('advise', value)}/>
    </div>
  {:else}
    <div class="rounded-corner-token textarea p-2">
      {#each characters as character}
        <div class="character">
          <div class="flex flex-col">
            <div class="flex flex-row gap-8">
              <span class="character-name">{character.name}</span> 
              <img class="trash" src={trashIcon} alt="削除"/>
            </div>
            <div class="flex flex-row gap-1">
              <img class="portrait" src={bellIcon} alt="見た目"/>
              <div class="flex flex-col flex-grow gap-1">
                <AutoSizeTextarea bind:value={character.personality} minHeight={24}/>
                <AutoSizeTextarea bind:value={character.appearance} minHeight={24}/>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
    <div class="icon-container">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img class="advise" src={bellIcon} alt="AI生成" on:click={() => dispatch('advise', value)}/>
    </div>
  {/if}
</div>        

<style>
  .character-container {
    position: relative;
    width: 100%;
  }
  textarea {
    width: 100%;
    height: auto;
    padding: 4px;
    font-family: '源暎アンチック';
    font-size: 12px;
  }
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
  .icon-container {
    position: absolute;
    right: 16px;
    top: -30px;
  }
  .advise {
    width: 24px;
    height: 24px;
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
</style>