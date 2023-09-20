<svelte:options accessors={true}/>

<script lang="ts">
  import GoogleFont, { getFontStyle } from "@svelte-web-fonts/google";
  import type { GoogleFontVariant, GoogleFontDefinition, GoogleFontFamily } from "@svelte-web-fonts/google";
  import { createEventDispatcher } from 'svelte';
  import { parseFontFamily } from 'css-font-parser';
  import type { SearchOptions } from './fontStore';

  type FontDefinition = GoogleFontDefinition & { distinction: string };

  const dispatch = createEventDispatcher();

  const normalFontFamilies = [
    "'BIZ UDGothic', sans-serif",
    "'BIZ UDMincho', serif",
    "'BIZ UDPGothic', sans-serif",
    "'BIZ UDPMincho', serif",
    "'Dela Gothic One', cursive",
    "'DotGothic16', sans-serif",
    "'Hachi Maru Pop', cursive",
    "'Hina Mincho', serif",
    "'IBM Plex Sans JP', sans-serif",
    "'Kaisei Decol', serif",
    "'Kaisei HarunoUmi', serif",
    "'Kaisei Opti', serif",
    "'Kaisei Tokumin', serif",
    "'Kiwi Maru', serif",
    "'Klee One', cursive",
    "'Kosugi', sans-serif",
    "'Kosugi Maru', sans-serif",
    "'M PLUS 1', sans-serif",
    "'M PLUS 1 Code', sans-serif",
    "'M PLUS 1p', sans-serif",
    "'M PLUS 2', sans-serif",
    "'M PLUS Rounded 1c', sans-serif",
    "'Mochiy Pop One', sans-serif",
    "'Mochiy Pop P One', sans-serif",
    "'New Tegomin', serif",
    "'Noto Sans JP', sans-serif",
    "'Noto Serif JP', serif",
    "'Potta One', cursive",
    "'Rampart One', cursive",
    "'Reggae One', cursive",
    "'RocknRoll One', sans-serif",
    "'Sawarabi Gothic', sans-serif",
    "'Shippori Antique', sans-serif",
    "'Shippori Antique B1', sans-serif",
    "'Shippori Mincho', serif",
    "'Shippori Mincho B1', serif",
    "'Stick', sans-serif",
    "'Yuji Boku', serif",
    "'Yuji Mai', serif",
    "'Yuji Syuku', serif",
    "'Yusei Magic', sans-serif",
    "'Zen Antique', serif",
    "'Zen Antique Soft', serif",
    "'Zen Kaku Gothic Antique', sans-serif",
    "'Zen Kaku Gothic New', sans-serif",
    "'Zen Kurenaido', sans-serif",
    "'Zen Maru Gothic', sans-serif",
    "'Zen Old Mincho', serif",
  ];

  const boldFontFamilies = [
    "'BIZ UDGothic', sans-serif",
    "'BIZ UDMincho', serif",
    "'BIZ UDPGothic', sans-serif",
    "'BIZ UDPMincho', serif",
    "'IBM Plex Sans JP', sans-serif",
    "'Kaisei Decol', serif",
    "'Kaisei HarunoUmi', serif",
    "'Kaisei Opti', serif",
    "'Kaisei Tokumin', serif",
    // "'Kiwi Maru', serif", 500
    // "'Klee One', cursive", 600
    "'M PLUS 1', sans-serif",
    "'M PLUS 1 Code', sans-serif",
    "'M PLUS 1p', sans-serif",
    "'M PLUS 2', sans-serif",
    "'M PLUS Rounded 1c', sans-serif",
    "'Noto Sans JP', sans-serif",
    "'Noto Serif JP', serif",
    "'Shippori Mincho', serif",
    "'Shippori Mincho B1', serif",
    "'Zen Kaku Gothic Antique', sans-serif",
    "'Zen Kaku Gothic New', sans-serif",
    "'Zen Maru Gothic', sans-serif",
    "'Zen Old Mincho', serif",
  ];

  export let searchOptions: SearchOptions = { filterString: '', mincho: true, gothic: true, normal: true, bold: true };

  const normalFonts = normalFontFamilies.map((fontFamily) => {
    const ff = parseFontFamily(fontFamily);
    const font: FontDefinition = {
      family: ff[0],
      variants: ["400" as GoogleFontVariant],
      distinction: ff[1],
    };
    return font;
  });

  const boldFonts = boldFontFamilies.map((fontFamily) => {
    const ff = parseFontFamily(fontFamily);
    const font: FontDefinition = {
      family: ff[0],
      variants: ["700" as GoogleFontVariant],
      distinction: ff[1],
    };
    return font;
  });

  const fonts = [...normalFonts, ...boldFonts];
  let filteredFonts = fonts;

  function chooseFont(event: MouseEvent, fontFamily: string, fontWeight: string) {
    dispatch('choose', { event, fontFamily, fontWeight });
  }

  $:filterFonts(searchOptions);
  function filterFonts(so: SearchOptions) {
    const { filterString, mincho, gothic, normal, bold } = so;
    const ff = fonts.filter((font) => {
      const isMincho = font.distinction === "serif";
      const isGothic = font.distinction === "sans-serif";
      const isNormal = font.variants.includes("400" as GoogleFontVariant);
      const isBold = font.variants.includes("700" as GoogleFontVariant);
      const isMatched = filterString === "" || font.family.includes(filterString);
      return (
        ((mincho && isMincho) || (gothic && isGothic)) &&
        ((normal && isNormal) || (bold && isBold))
      ) && isMatched;
    });
    filteredFonts = ff;
  }

  function getFontStyle2(fontFamily: string, fontWeight: string) {
    return getFontStyle(fontFamily as GoogleFontFamily, fontWeight as GoogleFontVariant);
  }

</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin={"anonymous"} />
    <GoogleFont fonts="{fonts}" display="swap" />
</svelte:head>

<!-- Used for illustration purposes -->

{#each filteredFonts as font}
    {#each font.variants as variant}
        <div class="font-sample" style={getFontStyle2(font.family, variant)}>
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <span on:click={e=>chooseFont(e,font.family, variant)}>{font.family} 今日はいい天気ですね</span>
        </div>
    {/each}
{/each}

<style>
  .font-sample {
    font-size: 22px;
    cursor: pointer;
  }
  span:hover {
    color: rgb(128, 93, 47);
  }
</style>