<script lang="ts">
  import { TabGroup, Tab } from '@skeletonlabs/skeleton';
  import { batchImagingPage, busy } from "./batchImagingStore";
  import { collectLeaves } from '../lib/layeredCanvas/dataModels/frameTree';
  import Drawer from '../utils/Drawer.svelte'
  import BatchImagingDalle3 from './BatchImagingDalle3.svelte';
  import BatchImagingFlux from './BatchImagingFlux.svelte';
  import type { Page } from "../lib/book/book";
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import type { ImagingContext } from '../utils/feathralImaging';
  import ImagingProgressBar from './ImagingProgressBar.svelte';

  import "../box.css"  
  import feathralIcon from '../assets/feathral.png';

  let tabSet: number = 0;
  let imagingContext: ImagingContext = {
    awakeWarningToken: false,
    errorToken: false,
    total: 0,
    succeeded: 0,
    failed: 0,
  };

  $: updateImageInfo($batchImagingPage);
  function updateImageInfo(page: Page | null) {
    if (!page) { return; }

    const leaves = collectLeaves(page.frameTree);
    console.log(leaves);
    const m = leaves.length;
    const n = leaves.filter((leaf) => 0 < leaf.filmStack.films.length).length;

    imagingContext.total = m;
    imagingContext.succeeded = n;
    console.log(imagingContext);
  }

</script>

<Drawer open={$batchImagingPage != null} size="240px" on:clickAway={() => $batchImagingPage = null} placement={"top"}>
  <div class="drawer-content flex flex-col">
    <TabGroup regionList="h-12">
      <Tab regionTab="w-24" bind:group={tabSet} name="tab3" value={0}><span class="tab"><img class="image" src={feathralIcon} alt="flux" width=24 height=24/>Flux</span></Tab>
      <Tab regionTab="w-24" bind:group={tabSet} name="tab1" value={1}>Dall・E 3</Tab>
    </TabGroup>  
    <div class="w-full h-full">
      {#if $busy}
        <div class="w-full h-full flex flex-row justify-center">
          <div class="progress-container">
            <ImagingProgressBar bind:imagingContext={imagingContext}/>
          </div>
        </div>
      {:else}
        <div class="hbox h-full">
          <div class="common w-64 h-full flex flex-col justify-center gap-2">
            <div>画像一括生成</div>
            <div>{imagingContext.succeeded}/{imagingContext.total}</div>
          </div>
          <div class="content h-full flex flex-col justify-center gap-2">
            {#if tabSet === 0}
              <BatchImagingFlux bind:imagingContext={imagingContext}/>
            {:else if tabSet === 1}
              <BatchImagingDalle3 bind:imagingContext={imagingContext}/>
            {/if}
          </div>
        </div>
      {/if}
    </div> 
  </div>
</Drawer>  

<style>
  .drawer-content {
    font-family: '源暎エムゴ';
    background-color: rgb(var(--color-surface-100));
    height: 100%;
  }
  .tab {
    display: flex;
    flex-direction: row;
  }
  .common {
    font-weight: 500;
    font-size: 24px;
    text-align: center;
  }
  .content {
    width: 100%;
    height: 100%;
    font-family: 'Yu Gothic', sans-serif;
    font-weight: 500;
    font-size: 24px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .progress-container {
    width: 600px;
    height: 100%;
    align-self: center;
  }
</style>