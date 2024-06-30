<script lang="ts">
  import type { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';
  import type { Page } from '../bookeditor/book';
  import { imageGeneratorTarget } from '../generator/imageGeneratorStore';
  import { FilmStack } from '../lib/layeredCanvas/dataModels/film';

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