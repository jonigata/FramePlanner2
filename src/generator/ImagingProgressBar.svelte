<script lang="ts">
  import { ProgressBar } from '@skeletonlabs/skeleton';
  import type { ImagingContext } from '../utils/feathralImaging';

  export let imagingContext: ImagingContext;
  export let imageProgress: number | null = null;
</script>

<div class="w-hull h-full flex flex-col justify-center items-center">
  <h2>画像生成中</h2>
  <!-- per page --> 
  <div class="w-full pl-4 items-center mb-2">
    <ProgressBar label="Progress Bar" value={imagingContext.succeeded + imagingContext.failed} max={imagingContext.total || 1} />
  </div>
  <!-- total --> 
  {#if imageProgress !== null}
    <div class="w-full pl-4 items-center mb-2">
      <ProgressBar label="Progress Bar" value={imageProgress} max={1} />
    </div>
  {/if}
</div>

<style>
  h2 {
    font-family: '源暎エムゴ';
    font-weight: 500;
    font-size: 24px;
  }
</style>