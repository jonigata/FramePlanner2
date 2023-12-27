<script lang="ts">
  import { redrawToken } from '../paperStore';
  import { generateImageWithScribble } from "../generator/sdwebui";

  let busy: boolean;
  let queued: boolean;

  export async function doScribble(url, refered, prompt, lcm, target) {
    if (busy) { 
      queued = true;
      return; 
    }

    busy = true;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = refered.width;
      canvas.height = refered.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(refered, 0, 0);

      const source = document.createElement('img');
      source.src = canvas.toDataURL();
      await source.decode();      

      const img = await generateImageWithScribble(url, source, prompt, lcm);
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
