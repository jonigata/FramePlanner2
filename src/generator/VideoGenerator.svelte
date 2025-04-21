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
  let duration: "4" | "5" | "10" = "5";
  let aspectRatio: "1:1" | "16:9" | "9:16" = "1:1";
  let model: "kling" | "FramePack" = "FramePack";
  let sourceMedia: Media;
  let promptWaiting: boolean;
  let cost: number = 50;
  
  // モデルごとの利用可能なオプション
  const modelOptions = {
    FramePack: {
      durations: [
        { value: "1", label: "1秒" },
        { value: "2", label: "2秒" },
        { value: "3", label: "3秒" },
        { value: "4", label: "4秒" },
        { value: "5", label: "5秒" },
      ],
      aspectRatios: [
        { value: "16:9", label: "横長 (16:9)" },
        { value: "9:16", label: "縦長 (9:16)" }
      ],
      cost: (duration: string) => {
        return parseInt(duration) * 5;
      }
    },
    kling: {
      durations: [
        { value: "5", label: "5秒" },
      ],
      aspectRatios: [
        { value: "1:1", label: "正方形 (1:1)" },
        { value: "16:9", label: "横長 (16:9)" },
        { value: "9:16", label: "縦長 (9:16)" },
      ],
      cost: () => {
        return 50;
      }
    }
  };
  
  // モデル変更時に互換性のあるオプションに自動調整
  $: if (model) {
    const availableDurations = modelOptions[model].durations.map(d => d.value);
    const availableAspectRatios = modelOptions[model].aspectRatios.map(a => a.value);
    
    // 現在の値が新しいモデルで利用可能でない場合は、最初のオプションに設定
    if (!availableDurations.includes(duration)) {
      duration = availableDurations[0] as any;
    }
    
    if (!availableAspectRatios.includes(aspectRatio)) {
      aspectRatio = availableAspectRatios[0] as any;
    }

    cost = modelOptions[model].cost(duration);
  }

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
      aspectRatio,
      model
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
  画像を把握して、この画像から始まる短いシーン(${duration}秒程度の動画)を考えて、説明してください。
  画面上の物体がよく動く様子やカメラワーク、ライティングを具体的に記述してください。
  この画像以前の動画を描くことはできないので、注意してください。
  つまり、必ずこの画像から始まる動画を生成するためのプロンプトを作成する必要があります。
　簡潔に3行程度にまとめてください。
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

      <div class="grid grid-cols-2 gap-4">
        <label class="label">
          <h3>モデル</h3>
          <select bind:value={model} class="select">
            <option value="FramePack">FramePack</option>
            <option value="kling">kling-1.6</option>
          </select>
        </label>

        <label class="label">
          <h3>時間</h3>
          <select bind:value={duration} class="select">
            {#each modelOptions[model].durations as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </label>
      </div>

      <div class="grid grid-cols-1 gap-4">
        <label class="label">
          <h3>アスペクト比(横:縦)</h3>
          <select bind:value={aspectRatio} class="select">
            {#each modelOptions[model].aspectRatios as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </label>
      </div>
    </div>
  </section>

  <footer class="card-footer flex gap-2">
    <div class="flex-1"></div>
    <button class="btn variant-ghost-surface" on:click={onCancel}>
      キャンセル
    </button>
    <button class="btn variant-filled-primary flex flex-row gap-2" on:click={onSubmit}>
      <span class="generate-text">生成</span><FeathralCost cost={cost}/>
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
  button .generate-text {
    font-family: '源暎エムゴ';
    font-size: 18px;
  }
</style>
