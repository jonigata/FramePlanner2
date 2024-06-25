<script lang="ts">
  import type { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';
  import type { Page } from '../bookeditor/book';
  import { imageGeneratorTarget } from '../generator/imageGeneratorStore';

  let targetPage: Page = null;
  let targetFrame: FrameElement = null;

  export async function run(page: Page, frame: FrameElement): Promise<{image: HTMLImageElement, prompt: string}> {
    return new Promise((resolve, reject) => {
      targetPage = page;
      targetFrame = frame;
      $imageGeneratorTarget = {
        page,
        frame,
        onDone: resolve,
      };
    });
  }
</script>

<div>
  
</div>

<style>
  
</style>