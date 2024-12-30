<script lang="ts">
  import GoogleFont from "@svelte-web-fonts/google";
  import { getFontStyle } from "@svelte-web-fonts/google";
  import type { GoogleFontVariant, GoogleFontDefinition, GoogleFontFamily } from "@svelte-web-fonts/google";
  import { forceFontLoadToken, mainBook, redrawToken, fontLoadToken } from "./bookStore";
  import type { Book } from "../lib/book/book";
  import { onMount } from "svelte";

  let googleFonts: GoogleFontDefinition[] = [];

  $: onBookChanged($mainBook, $forceFontLoadToken);
  async function onBookChanged(book: Book | null, _fflt: boolean) {
    if (!book) { return; }
    $forceFontLoadToken = false;

    googleFonts = [];
    let redraws = false;
    for (let page of book.pages) {
      for (let bubble of page.bubbles) {
        if (load(bubble.fontFamily, bubble.fontWeight)) {
          redraws = true;
        }
      }
    }
    if (redraws) {
      $redrawToken = true;
    }
  }

  $: onFontLoad($fontLoadToken);
  function onFontLoad(tokens: {family: string, weight: string}[] | null) {
    if (tokens) {
      for (let token of tokens) {
        load(token.family, token.weight);
      }
    }
  }  

  const localFontFiles: { [key: string]: string } = {
    '源暎アンチック': 'GenEiAntiqueNv5-M',
    '源暎エムゴ': 'GenEiMGothic2-Black',
    '源暎ぽっぷる': 'GenEiPOPle-Bk',
    '源暎ラテゴ': 'GenEiLateMinN_v2',
    '源暎ラテミン': 'GenEiLateMinN_v2',
    "ふい字": 'HuiFont29',
    "まきばフォント": 'MakibaFont13',
  }

  const cache = new Set<string>();

  // キャッシュ機構(重複管理など)はFontFace APIが持っているので、基本的には余計なことはしなくてよい
  // と思いきや一瞬ちらつくようなのでキャッシュする
  function load(family: string, weight: string): boolean {
    if (cache.has(`${family}:${weight}`)) { return false; }
    cache.add(`${family}:${weight}`);

    const localFile = localFontFiles[family];
    console.log("load font", family, weight, localFile)
    if (localFile) {
      const url = `/fonts/${localFile}.woff2`;
      const font = new FontFace(family, `url(${url}) format('woff2')`, { style: 'normal', weight });

      document.fonts.add(font);
    } else {
      getFontStyle(family as GoogleFontFamily, weight as GoogleFontVariant);
      const font: GoogleFontDefinition = {
        family: family,
        variants: [weight as GoogleFontVariant],
      };
      googleFonts.push(font);
    }
    return true;
  }

  onMount(() => {
    document.fonts.addEventListener('loadingdone', (event) => {
      console.tag("fonts.onloadingdone", "orange", event);
      $redrawToken = true;
    });
  });
</script>

<svelte:head>
  <GoogleFont fonts="{googleFonts}" display="swap"/>
</svelte:head>

<style>
  
</style>