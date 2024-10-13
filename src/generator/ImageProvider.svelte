<script lang="ts">
  import { imageGeneratorTarget } from '../generator/imageGeneratorStore';
  import type { FilmStack } from '../lib/layeredCanvas/dataModels/film';

  export async function run(initialPrompt: string | null, filmStack: FilmStack, gallery: HTMLCanvasElement[]): Promise<{canvas: HTMLCanvasElement, prompt: string} | null> {
    return new Promise((resolve, reject) => {
      $imageGeneratorTarget = {
        initialPrompt,
        filmStack,
        gallery,
        onDone: resolve,
      };
    });
  }
</script>

<div>
  
</div>

<style>
  
</style>