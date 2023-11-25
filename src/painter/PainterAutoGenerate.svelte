<script lang="ts">
  import { redrawToken } from '../paperStore';
  import { generateImageWithScribble } from "../generator/sdwebui";

  let busy: boolean;
  let queued: boolean;

  export async function doScribble(callGeneration, url, refered, prompt, lcm, target) {
    if (!callGeneration) {
      target.src = refered.src;
      await target.decode();
      $redrawToken = true;
      return;
    }

    if (busy) { 
      queued = true;
      return; 
    }

    busy = true;
    try {
      const img = await generateImageWithScribble(url, refered, prompt, lcm);
      target.src = img.src;
      await target.decode();
    } catch (e) {
      console.log(e);
      // toastStore.trigger({ message: `画像生成エラー: ${e}`, timeout: 3000});
    }
    busy = false;
    $redrawToken = true;

    if (queued) {
      queued = false;
      doScribble(callGeneration, url, refered, prompt, lcm, target);
    }
  }
</script>
