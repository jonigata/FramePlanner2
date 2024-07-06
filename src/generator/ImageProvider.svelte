<script lang="ts">
  import { imageGeneratorTarget } from '../generator/imageGeneratorStore';
  import type { FilmStack } from '../lib/layeredCanvas/dataModels/film';

  export async function run(initialPrompt: string, filmStack: FilmStack, gallery: HTMLImageElement[]): Promise<{image: HTMLImageElement, prompt: string}> {
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