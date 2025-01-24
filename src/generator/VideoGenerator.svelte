<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import type { ImageToVideoRequest } from '../utils/edgeFunctions/types/imagingTypes';
  import type { Media } from '../lib/layeredCanvas/dataModels/media';
  
  export let sourceMedia: Media;

  let prompt = '';
  let duration: "5" | "10" = "5";
  let aspectRatio: "1:1" | "16:9" | "9:16" = "1:1";

  async function onSubmit() {
    const request: ImageToVideoRequest = {
      prompt,
      image_url: sourceMedia.drawSourceCanvas.toDataURL(),
      duration,
      aspect_ratio: aspectRatio
    };
    
    modalStore.close();
    // TODO: API call implementation
  }
</script>

<div class="card p-4 w-modal shadow-xl">
  <header class="card-header">
    <h3>Generate Video</h3>
  </header>
  
  <section class="p-4">
    <div class="grid grid-cols-1 gap-4">
      <div class="preview-image">
        <img 
          src={sourceMedia.drawSourceCanvas.toDataURL()} 
          alt="Source" 
          class="w-full h-48 object-contain"
        />
      </div>

      <label class="label">
        <span>Prompt</span>
        <textarea
          class="textarea"
          bind:value={prompt}
          rows="3"
          placeholder="Describe the video you want to generate..."
        />
      </label>

      <label class="label">
        <span>Duration</span>
        <select bind:value={duration} class="select">
          <option value="5">5 seconds</option>
          <option value="10">10 seconds</option>
        </select>
      </label>

      <label class="label">
        <span>Aspect Ratio</span>
        <select bind:value={aspectRatio} class="select">
          <option value="1:1">Square (1:1)</option>
          <option value="16:9">Landscape (16:9)</option>
          <option value="9:16">Portrait (9:16)</option>
        </select>
      </label>
    </div>
  </section>

  <footer class="card-footer">
    <button class="btn variant-ghost-surface" on:click={() => modalStore.close()}>
      Cancel
    </button>
    <button class="btn variant-filled-primary" on:click={onSubmit}>
      Generate
    </button>
  </footer>
</div>
