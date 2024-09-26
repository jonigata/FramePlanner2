<svelte:options accessors={true}/>

<script lang="ts">
  import GoogleFont from "@svelte-web-fonts/google";
  import type { GoogleFontVariant, GoogleFontDefinition } from "@svelte-web-fonts/google";
  import { createEventDispatcher } from 'svelte';
  import { parseFontFamily } from 'css-font-parser';
  import type { SearchOptions } from './fontStore';
  import WebFontListItem from "./WebFontListItem.svelte";

  type FontDefinition = GoogleFontDefinition & { isGothic: boolean, isBold: boolean, isLocal: boolean };

  const dispatch = createEventDispatcher();

  const normalFontFamilies_google = [
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
    "'Yomogi', cursive",
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
    "'Shizuru', system-ui",
    "'Cherry Bomb One', system-ui",
    "'Slackside One', cursive",
    "'Darumadrop One', sans-serif",
  ];

  const boldFontFamilies_google = [
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

  const normalFonts = normalFontFamilies_google.map((fontFamily) => {
    const ff = parseFontFamily(fontFamily);
    const font: FontDefinition = {
      family: ff[0],
      variants: ["400" as GoogleFontVariant],
      isGothic: ff[1] === "sans-serif",
      isBold: false,
      isLocal: false,
    };
    return font;
  });

  const boldFonts = boldFontFamilies_google.map((fontFamily) => {
    const ff = parseFontFamily(fontFamily);
    const font: FontDefinition = {
      family: ff[0],
      variants: ["700" as GoogleFontVariant],
      isGothic: ff[1] === "sans-serif",
      isBold: true,
      isLocal: false,
    };
    return font;
  });

  const googleFonts = [...normalFonts, ...boldFonts];

  const localFonts: FontDefinition[] = [
    {
      family: '源暎アンチック',
      variants: ["400" as GoogleFontVariant],
      isGothic: false,
      isBold: false,
      isLocal: true,
    },
    {
      family: '源暎エムゴ',
      variants: ["400" as GoogleFontVariant],
      isGothic: true,
      isBold: false,
      isLocal: true,
    },
    {
      family: '源暎ぽっぷる',
      variants: ["400" as GoogleFontVariant],
      isGothic: false,
      isBold: false,
      isLocal: true,
    },
    {
      family: '源暎ラテゴ',
      variants: ["400" as GoogleFontVariant],
      isGothic: true,
      isBold: false,
      isLocal: true,
    },
    {
      family: '源暎ラテミン',
      variants: ["400" as GoogleFontVariant],
      isGothic: false,
      isBold: false,
      isLocal: true,
    },
    {
      family: 'ふい字',
      variants: ["400" as GoogleFontVariant],
      isGothic: false,
      isBold: false,
      isLocal: true,
    },
    {
      family: 'まきばフォント',
      variants: ["400" as GoogleFontVariant],
      isGothic: false,
      isBold: false,
      isLocal: true,
    },
  ];

  let allFonts = [...localFonts, ...googleFonts];
  let filteredFonts = allFonts;

  function chooseFont(e: CustomEvent<{ mouseEvent: MouseEvent, font: FontDefinition }>) {
    dispatch('choose', e.detail);
  }

  $:filterFonts(searchOptions);
  function filterFonts(so: SearchOptions) {
    const { filterString, mincho, gothic, normal, bold } = so;
    const ff = allFonts.filter((font) => {
      const isMincho = !font.isGothic;
      const isGothic = font.isGothic;
      const isNormal = !font.isBold;
      const isBold = font.isBold;
      const isMatched = filterString === "" || font.family.includes(filterString);
      return (
        ((mincho && isMincho) || (gothic && isGothic)) &&
        ((normal && isNormal) || (bold && isBold))
      ) && isMatched;
    });
    filteredFonts = ff;
  }

</script>

<svelte:head>
  <GoogleFont fonts="{googleFonts}" display="swap"/>
</svelte:head>

<!--
<div class="font-sample" style="font-family: 'genei-antique'; font-weight: 400; font-style: normal;">
  <span on:click={e=>{}}>源暎アンチック(ローカル) 今日はいい天気ですね</span>
</div>
-->

{#each filteredFonts as font}
  {#each font.variants as variant}
    <WebFontListItem font={font} on:choose={chooseFont}/>
  {/each}
{/each}

<style>
</style>