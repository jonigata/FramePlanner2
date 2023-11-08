<script lang="ts">
  import { imageGeneratorOpen } from "./imageGeneratorStore";
  import Drawer from './Drawer.svelte';
  import ImageGeneratorStableDiffusion from "./ImageGeneratorStableDiffusion.svelte";
  import ImageGeneratorDalle3 from "./ImageGeneratorDalle3.svelte";
  import { TabGroup, Tab, TabAnchor } from '@skeletonlabs/skeleton';

  let busy: boolean;
  let tabSet: number = 0;

  function onClickAway() {
    if (busy) { return; }
    $imageGeneratorOpen = false;
  }
</script>

<div class="drawer-outer">
  <Drawer
    open={$imageGeneratorOpen}
    placement="right"
    size="720px"
    on:clickAway={onClickAway}
  >

  <TabGroup>
    <Tab bind:group={tabSet} name="tab1" value={0}>Dall・E 3</Tab>
    <Tab bind:group={tabSet} name="tab2" value={1}>Stable Diffusion</Tab>
    <!-- Tab Panels --->
    <svelte:fragment slot="panel">
      {#if tabSet === 0}
        <ImageGeneratorDalle3 bind:busy={busy}/>
      {:else if tabSet === 1}
        <ImageGeneratorStableDiffusion bind:busy={busy}/>
      {/if}
    </svelte:fragment>
  </TabGroup>  

  </Drawer>
</div>

<style>
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
</style>
