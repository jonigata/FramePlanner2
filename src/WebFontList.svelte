<script lang="ts">
  import GoogleFont, { getFontStyle } from "@svelte-web-fonts/google";
  import type { GoogleFontDefinition, GoogleFontVariant } from "@svelte-web-fonts/google";
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  const fontSources = [
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

  const fonts = fontSources.map((fontSource) => {
    const font: GoogleFontDefinition = {
      family: fontSource,
      variants: ["regular", "bold"],
    };
    return font;
  });

  function chooseFont(event, fontStyle) {
    console.log(fontStyle);
    dispatch('choose', { fontStyle: fontStyle });
  }
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <GoogleFont fonts="{fonts}" display="swap" />
</svelte:head>

<!-- Used for illustration purposes -->

<h1>
    {#each fonts as font}
        {#each font.variants as variant}
            <div class="font-sample" style={getFontStyle(font.family, variant)}>
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <span on:click={e=>chooseFont(e,getFontStyle(font.family, variant))}>{font.family} 今日はいい天気ですね</span>
            </div>
        {/each}
    {/each}
</h1>

<style>
  .font-sample {
    font-size: 22px;
  }
  span:hover {
    color: rgb(128, 93, 47);
  }
</style>