<script lang="ts">
  import { TabGroup, Tab } from '@skeletonlabs/skeleton';
  import { batchImagingPage } from "./batchImagingStore";
  import { collectLeaves } from '../lib/layeredCanvas/dataModels/frameTree';
  import Drawer from '../utils/Drawer.svelte'
  import BatchImagingDalle3 from './BatchImagingDalle3.svelte';
  import BatchImagingFeathral from './BatchImagingFeathral.svelte';
  import "../box.css"  
  import feathralIcon from '../assets/feathral.png';
  import { commitBook, type Page } from "../bookeditor/book";
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import { mainBook, redrawToken } from '../bookeditor/bookStore';

  let busy: boolean;
  let tabSet: number = 0;
  let totalCount = 1;
  let filledCount = 0;
  let dalle3;
  let feathral;

  $: updateImageInfo($batchImagingPage);
  function updateImageInfo(page: Page) {
    if (!page) { return; }

    const leaves = collectLeaves(page.frameTree);
    console.log(leaves);
    const m = leaves.length;
    const n = leaves.filter((leaf) => 0 < leaf.filmStack.films.length).length;

    totalCount = m;
    filledCount = n;
    console.log(totalCount, filledCount);
  }

  async function execute(child: any) {
    console.log('execute');
    busy = true;
    await child.excecute($batchImagingPage);
    busy = false;     
    console.log('execute done');
    commitBook($mainBook, null);
    $mainBook = $mainBook;
    $redrawToken = true;
  }
</script>

<Drawer open={$batchImagingPage != null} size="220px" on:clickAway={() => $batchImagingPage = null} placement={"top"}>
  <div class="drawer-content">
    <TabGroup regionList="h-12">
      <Tab regionTab="w-24" bind:group={tabSet} name="tab1" value={0}>Dall・E 3</Tab>
      <Tab regionTab="w-24" bind:group={tabSet} name="tab3" value={1}><span class="tab"><img class="image" src={feathralIcon} alt="feathral" width=24 height=24/>Feathral</span></Tab>
      <svelte:fragment slot="panel">
        {#if busy}
          <div class="content">
            <ProgressRadial width={"w-16"}/>
          </div>
        {:else}
          <div class="hbox">
            <div class="common w-64">
              <div>画像一括生成</div>
              <div>{filledCount}/{totalCount}</div>
            </div>
            <div class="content">
              {#if tabSet === 0}
                <BatchImagingDalle3 bind:this={dalle3}/>
                <button class="btn btn-sm variant-filled w-32" disabled={filledCount === totalCount} on:click={()=> execute(dalle3)}>開始</button>
              {:else if tabSet === 1}
                <BatchImagingFeathral bind:this={feathral}/>
                <button class="btn btn-sm variant-filled w-32" disabled={filledCount === totalCount} on:click={()=> execute(feathral)}>開始</button>
              {/if}
            </div>
          </div>
        {/if}
      </svelte:fragment> 
    </TabGroup>  
  </div>
</Drawer>  

<style>
  .drawer-content {
    background-color: rgb(var(--color-surface-100));
    height: 100%;
  }
  .tab {
    display: flex;
    flex-direction: row;
  }
  .common {
    font-family: 'Yu Gothic', sans-serif;
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
</style>