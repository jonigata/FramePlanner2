<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import type { ImageToVideoRequest } from '../utils/edgeFunctions/types/imagingTypes';
  import NotebookTextarea from '../notebook/NotebookTextarea.svelte';
  import { recognizeImage } from '../supabase';
  import type { Media } from '../lib/layeredCanvas/dataModels/media';
  import { onMount } from 'svelte';
  import { resizeCanvasIfNeeded } from '../lib/layeredCanvas/tools/imageUtil';
  import FeathralCost from '../utils/FeathralCost.svelte';
  
  let prompt = '';
  let duration: "5" | "10" = "5";
  let aspectRatio: "1:1" | "16:9" | "9:16" = "1:1";
  let sourceMedia: Media;
  let promptWaiting: boolean;

  function onCancel() {
    modalStore.close();
  }

  async function onSubmit() {
    const resizedCanvas = resizeCanvasIfNeeded(sourceMedia.drawSourceCanvas, 1024);
    const resizedImageUrl = resizedCanvas.toDataURL();
    const request: ImageToVideoRequest = {
      prompt,
      imageUrl: resizedImageUrl,
      duration,
      aspectRatio: aspectRatio
    };
    
    $modalStore[0].response!(request);
    modalStore.close();
  }

  async function onAskPrompt() {
    try {
      promptWaiting = true;
      const resizedCanvas = resizeCanvasIfNeeded(sourceMedia.drawSourceCanvas, 512);
      const resizedImageUrl = resizedCanvas.toDataURL();
      console.log("resizedImageUrl", resizedImageUrl.length);
      const response = await recognizeImage({
        dataUrl: resizedImageUrl,
        prompt: `
  画像を把握して、この画像から始まる短いシーン(5秒程度の動画)を考えて、説明してください。
  画面上の物体がよく動く様子やカメラワーク、ライティングを具体的に記述してください。
  この画像以前の動画を描くことはできないので、注意してください。
  つまり、必ずこの画像から始まる動画を生成するためのプロンプトを作成する必要があります。

  `
      });
      console.log(response);
      prompt = response.text;
    } finally {
      promptWaiting = false;
    }
  }

  onMount(() => {
    sourceMedia = $modalStore[0].meta.media;
  });
</script>

<div class="card p-4 w-modal shadow-xl">
  <header class="card-header">
    <h2>動画生成</h2>
  </header>
  
  <section class="p-4">
    <div class="grid grid-cols-1 gap-4">
      <div class="preview-image">
        <img 
          src={sourceMedia?.drawSourceCanvas.toDataURL()}
          alt="Source" 
          class="w-full h-64 object-contain"
        />
      </div>

      <div>
        <h3>プロンプト</h3>
        <NotebookTextarea
          bind:value={prompt}
          minHeight={90}
          placeholder="Describe the video you want to generate..."
          cost={2}
          bind:waiting={promptWaiting}
          on:advise={onAskPrompt}
        />
      </div>

      <!-- <label class="label">
        <span>Duration</span>
        <select bind:value={duration} class="select">
          <option value="5">5 seconds</option>
          <option value="10">10 seconds</option>
        </select>
      </label> -->

      <label class="label">
        <h3>アスペクト比(横:縦)</h3>
        <select bind:value={aspectRatio} class="select">
          <option value="1:1">正方形 (1:1)</option>
          <option value="16:9">横長 (16:9)</option>
          <option value="9:16">縦長 (9:16)</option>
        </select>
      </label>
    </div>
  </section>

  <footer class="card-footer flex gap-2">
    <div class="flex-1"></div>
    <button class="btn variant-ghost-surface" on:click={onCancel}>
      キャンセル
    </button>
    <button class="btn variant-filled-primary" on:click={onSubmit}>
      生成 <FeathralCost cost={50}/>
    </button>
  </footer>
</div>

<style>
  h2 {
    font-family: '源暎エムゴ';
    font-size: 24px;
    margin-top: 16px;
  }
  h3 { 
    font-family: '源暎エムゴ';
    font-size: 18px;
    margin-top: 8px;
  }
</style>
