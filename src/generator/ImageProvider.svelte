<script lang="ts">
  import { imageGeneratorTarget } from '../generator/imageGeneratorStore';
  import type { FilmStack } from '../lib/layeredCanvas/dataModels/film';
  import type { Media } from '../lib/layeredCanvas/dataModels/media';

  export async function run(initialPrompt: string | null, filmStack: FilmStack, gallery: Media[]): Promise<{media: Media, prompt: string} | null> {
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