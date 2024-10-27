<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import type { Character } from '../lib/book/notebook';
  import { toolTip } from '../utils/passiveToolTipStore';
  import NotebookCharacter from './NotebookCharacter.svelte';

  import bellIcon from '../assets/bell.png';

  const dispatch = createEventDispatcher();

  export let value = '';
  export let waiting = false;

  export let characters: Character[] = [
    /*
    { name: 'Alice', personality: 'まぬけ', appearance: 'かわいい' },
    { name: 'Bob', personality: '頭が良い', appearance: 'ふとっている' },
    */
  ];

  function add() {
    dispatch('add');
  }

  function portrait(e: CustomEvent<Character>) {
    dispatch('portrait', e.detail);
  }

  function remove(e: CustomEvent<Character>) {
    dispatch('remove', e.detail);
  }
</script>

<div class="character-container">
  {#if waiting}
    <div class="h-24 waiting rounded-corner-token textarea">
      <ProgressRadial stroke={100} width="w-10"/>
    </div>
  {:else if characters.length === 0}
    <div class="h-24 rounded-corner-token textarea p-2 flex flex-col">
    </div>
    <div class="icon-container">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img class="advise" src={bellIcon} alt="カイルちゃん考えて！" on:click={() => dispatch('advise', value)} use:toolTip={"カイルちゃん考えて！[2]"}/>
    </div>
  {:else}
    <div class="rounded-corner-token textarea p-2 flex flex-col gap-4">
      {#each characters as character (character.ulid)}
        <NotebookCharacter bind:character={character} on:portrait={portrait} on:remove={remove}/>
      {/each}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="rounded-corner-token textarea p-2 flex justify-center items-center mt-2" on:click={add}>
        <img class="advise" src={bellIcon} alt="キャラクター追加"/>
        <span class="add-character">キャラクター追加</span>
      </div>
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
  .add-character {
    font-size: 16px;
    font-weight: 700;
    font-family: 'Zen Maru Gothic';
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
  .waiting {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>