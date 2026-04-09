<script lang="ts">
  import type { GoogleFontDefinition } from "@svelte-web-fonts/google";
  import { createEventDispatcher } from 'svelte';

  type FontDefinition = GoogleFontDefinition & { isGothic: boolean, isBold: boolean, isLocal: boolean };

  export let font: FontDefinition;

  const dispatch = createEventDispatcher();

  function chooseFont(mouseEvent: MouseEvent) {
    dispatch('choose', { mouseEvent, font });
  }

  $: url = new URL(`../../assets/fonts/labels/${font.family.replace(/ /g, "-")}.webp`, import.meta.url).href;

</script>

<div>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <img src={url} alt={font.family} on:click={chooseFont}/>
</div>

<style>
  div {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  div:hover {
    background-color: rgb(128, 93, 47);
  }
</style>