<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import type { CharacterLocal } from '../lib/book/book';
  import { toolTip } from '../utils/passiveToolTipStore';
  import NotebookCharacter from './NotebookCharacter.svelte';

  import bellIcon from '../assets/bell.webp';

  const dispatch = createEventDispatcher();

  export let value = '';
  export let waiting = false;

  export let characters: CharacterLocal[] = [
    /*
    { name: 'Alice', personality: 'まぬけ', appearance: 'かわいい' },
    { name: 'Bob', personality: '頭が良い', appearance: 'ふとっている' },
    */
  ];

  function add() {
    dispatch('add');
  }

  function hire() {
    dispatch('hire');
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
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="flex gap-2 mt-2 w-full">
      <button class="btn variant-filled-primary flex items-center gap-2 flex-1 rounded" on:click={add}>
        <img class="advise" src={bellIcon} alt="キャラクター追加"/>
        <span class="add-character">キャラクター追加</span>
      </button>
      <button class="btn variant-filled-secondary flex items-center gap-2 flex-1 rounded" on:click={hire}>
        <span class="add-character">名簿から配役</span>
      </button>
    </div>
  {:else}
    <div class="rounded-corner-token textarea p-2 flex flex-col gap-4">
      {#each characters as character (character.ulid)}
        <NotebookCharacter bind:character={character} on:portrait on:remove on:register/>
      {/each}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="flex gap-2 mt-2 w-full">
        <button class="btn variant-filled-primary flex items-center gap-2 flex-1 rounded" on:click={add}>
          <img class="advise" src={bellIcon} alt="キャラクター追加"/>
          <span class="add-character">キャラクター追加</span>
        </button>
        <button class="btn variant-filled-secondary flex items-center gap-2 flex-1 rounded" on:click={hire}>
          <span class="add-character">名簿から配役</span>
        </button>
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