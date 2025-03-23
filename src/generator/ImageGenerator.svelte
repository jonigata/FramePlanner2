<script lang="ts">
  import { type ImageGeneratorTarget, imageGeneratorTarget } from "./imageGeneratorStore";
  import { TabGroup, Tab } from '@skeletonlabs/skeleton';
  import { tick } from "svelte";
  import feathralIcon from '../assets/feathral.webp';
  import Drawer from '../utils/Drawer.svelte';
  import ImageGeneratorStableDiffusion from "./ImageGeneratorStableDiffusion.svelte";
  import ImageGeneratorDalle3 from "./ImageGeneratorDalle3.svelte";
  import ImageGeneratorFlux from "./ImageGeneratorFlux.svelte";
  import ImageGeneratorPlain from "./ImageGeneratorPlain.svelte";
  import { type Media } from "../lib/layeredCanvas/dataModels/media";

  let busy: boolean;
  let tabSet: number = 0;
  let prompt: string = 'zzz';
  let gallery: Media[] = [];
  let chosen: Media | null = null;

  $: onTargetChanged($imageGeneratorTarget);
  function onTargetChanged(igt: ImageGeneratorTarget | null) {
    if (igt) {
      prompt = igt.initialPrompt ?? '';
    }
  }

  $: onChangeGallery($imageGeneratorTarget?.gallery);
  async function onChangeGallery(g: Media[] | undefined) {
    if (g) {
      gallery = [];
      await tick(); // HACK: なんかこうしないとHTMLが更新されない
      gallery = g;
    }
  }

  $: onChosen(chosen);
  function onChosen(c: Media | null) {
    if (c != null) {
      const t = $imageGeneratorTarget!;
      $imageGeneratorTarget = null;
      chosen = null;
      t.onDone({ media: c, prompt: prompt });
    }
  }

  function onClickAway() {
    if (busy) { return; }
    const t = $imageGeneratorTarget!;
    $imageGeneratorTarget = null;
    t.onDone(null);
  }
</script>

<div class="drawer-outer">
  <Drawer
    open={$imageGeneratorTarget != null}
    placement="right"
    size="800px"
    on:clickAway={onClickAway}
  >

    <TabGroup>
      <Tab bind:group={tabSet} name="tab3" value={0}><span class="tab"><img src={feathralIcon} alt="flux" width=24 height=24/>Flux</span></Tab>
      <Tab bind:group={tabSet} name="tab1" value={1}>Dall・E 3</Tab>
      <Tab bind:group={tabSet} name="tab2" value={2}>Stable Diffusion</Tab>
      <Tab bind:group={tabSet} name="tab4" value={3}>白紙</Tab>
      <!-- Tab Panels --->
      <svelte:fragment slot="panel">
        {#if tabSet === 0}
          <ImageGeneratorFlux bind:busy={busy} bind:prompt={prompt} bind:gallery={gallery} bind:chosen={chosen}/>
          {:else if tabSet === 1}
          <ImageGeneratorDalle3 bind:busy={busy} bind:prompt={prompt} bind:gallery={gallery} bind:chosen={chosen}/>
          {:else if tabSet === 2}
          <ImageGeneratorStableDiffusion bind:busy={busy} bind:prompt={prompt} bind:gallery={gallery} bind:chosen={chosen}/>
          {:else if tabSet === 3}
          <ImageGeneratorPlain bind:chosen={chosen}/>
        {/if}
      </svelte:fragment>
    </TabGroup>  

  </Drawer>
</div>

<style>
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
  .tab {
    display: flex;
    align-items: center;
    gap: 5px;
  }
</style>
