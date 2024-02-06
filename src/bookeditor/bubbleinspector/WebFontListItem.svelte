<script lang="ts">
  import GoogleFont, { getFontStyle } from "@svelte-web-fonts/google";
  import type { GoogleFontVariant, GoogleFontDefinition, GoogleFontFamily } from "@svelte-web-fonts/google";
  import { onMount } from "svelte";
  import { createEventDispatcher } from 'svelte';
  import type KeyValueStorage from "../../utils/KeyValueStorage.svelte";

  type FontDefinition = GoogleFontDefinition & { isGothic: boolean, isBold: boolean, isLocal: boolean };

  export let font: FontDefinition;
  export let variant: GoogleFontVariant;
  export let kvs: KeyValueStorage;

  let style: string = null;

  const fontFiles = {
    '源暎アンチック': 'src/assets/fonts/GenEiAntiqueNv5-M.woff2',
    '源暎エムゴ': 'src/assets/fonts/GenEiMGothic2-Black.woff2',
    '源暎ぽっぷる': 'src/assets/fonts/GenEiPOPle-Bk.woff2',
    '源暎ラテゴ': 'src/assets/fonts/GenEiLateMinN_v2.woff2',
    '源暎ラテミン': 'src/assets/fonts/GenEiLateMinN_v2.woff2',
  }

  const dispatch = createEventDispatcher();

  function chooseFont(mouseEvent: MouseEvent) {
    dispatch('choose', { mouseEvent, fontFamily: font.family, fontWeight: variant });
  }

  async function loadFont() {
    const fontFace = new FontFace(font.family, `url(${fontFiles[font.family]}) format('woff2')`);
    fontFace.weight = font.isBold ? '700' : '400';
    fontFace.style = 'normal';
    console.log('loading');
    await fontFace.load();
    document.fonts.add(fontFace);
    kvs.set(font.family, "true");
    style = `font-family: '${font.family}'; font-weight: ${font.isBold ? 700 : 400}; font-style: normal;`;
    console.log('loaded');
  }

  onMount(async () => {
    if (font.isLocal) {
      await kvs.waitForReady();
      const loaded = await kvs.get(font.family);

      if (loaded === "true") {
        style = `font-family: '${font.family}'; font-weight: ${font.isBold ? 700 : 400}; font-style: normal;`;
      } else {
        style = `font-family: 'Noto Sans JP'; font-weight: 400; font-style: normal;`;
      }
    } else {
      style = getFontStyle(font.family as GoogleFontFamily, variant as GoogleFontVariant);
    }
  });

</script>

<div class="font-sample" style={style}>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <span on:click={chooseFont}>{font.family} 今日はいい天気ですね</span>
  {#if font.isLocal}
    <button on:click={loadFont}>ロード</button>
  {/if}
</div>

<style>
  .font-sample {
    font-size: 22px;
    cursor: pointer;
  }
  span:hover {
    color: rgb(128, 93, 47);
  }
</style>