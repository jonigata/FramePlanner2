<script lang="ts">
  import { getFontStyle } from "@svelte-web-fonts/google";
  import type { GoogleFontVariant, GoogleFontFamily } from "@svelte-web-fonts/google";
  import { forceFontLoadToken, mainBook, redrawToken } from "./bookStore";
  import { onMount } from "svelte";

  $: onBookChanged($mainBook, $forceFontLoadToken);
  async function onBookChanged(book, _fflt) {
    if (!book) { return; }
    $forceFontLoadToken = false;

    for (let page of book.pages) {
      for (let bubble of page.bubbles) {
        load(bubble.fontFamily, bubble.fontWeight);
      }
    }
  }

  const localFontFiles = {
    '源暎アンチック': 'GenEiAntiqueNv5-M',
    '源暎エムゴ': 'GenEiMGothic2-Black',
    '源暎ぽっぷる': 'GenEiPOPle-Bk',
    '源暎ラテゴ': 'GenEiLateMinN_v2',
    '源暎ラテミン': 'GenEiLateMinN_v2',
  }

  const cache = new Set<string>();

  // キャッシュ機構(重複管理など)はFontFace APIが持っているので、基本的には余計なことはしなくてよい
  // と思いきや一瞬ちらつくようなのでキャッシュする
  function load(family: string, weight: string) {
    if (cache.has(`${family}:${weight}`)) { return; }
    cache.add(`${family}:${weight}`);

    console.log("load font", family, weight)
    const localFile = localFontFiles[family];
    if (localFile) {
      const font = new FontFace(family, `url(src/assets/fonts/${localFile}.woff2) format('woff2')`, { style: 'normal', weight });
      document.fonts.add(font);
      $redrawToken = true;
    } else {
      getFontStyle(family as GoogleFontFamily, weight as GoogleFontVariant);
    }
  }

  onMount(() => {
    document.fonts.addEventListener('loadingdone', (event) => {
      console.tag("loadingdone", "orange", event);
      $redrawToken = true;
    });
  });
</script>

<style>
  
</style>