<script lang="ts">
  import { imageGeneratorTarget } from "./imageGeneratorStore";
  import Drawer from '../utils/Drawer.svelte';
  import ImageGeneratorStableDiffusion from "./ImageGeneratorStableDiffusion.svelte";
  import ImageGeneratorDalle3 from "./ImageGeneratorDalle3.svelte";
  import ImageGeneratorFeathral from "./ImageGeneratorFeathral.svelte";
  import { TabGroup, Tab } from '@skeletonlabs/skeleton';
  import { tick } from "svelte";
  import type { FrameElement } from "../lib/layeredCanvas/dataModels/frameTree";
  import { mainBook } from '../bookeditor/bookStore';
  import { commitBook } from '../bookeditor/book';
  import feathralIcon from '../assets/feathral.png';

  let busy: boolean;
  let tabSet: number = 0;
  let prompt: string = 'zzz';
  let gallery: HTMLImageElement[] = [];
  let chosen: HTMLImageElement = null;

  $: onTargetChanged($imageGeneratorTarget);
  function onTargetChanged(t: FrameElement) {
    if (t) {
      console.log("imageGenerator.prompt", t.prompt);
      prompt = t.prompt;
    }
  }

  $: onChangeGallery($imageGeneratorTarget?.gallery);
  async function onChangeGallery(g: HTMLImageElement[]) {
    if (g) {
      gallery = [];
      await tick(); // HACK: なんかこうしないとHTMLが更新されない
      gallery = g;
    }
  }

  $: onChosen(chosen);
  function onChosen(c: HTMLImageElement) {
    if (c) {
      const t = $imageGeneratorTarget;
      $imageGeneratorTarget = null;
      chosen = null;
      t.prompt = prompt;
      t.image = {
        image: c,
        scribble: null,
        n_translation: [0, 0],
        n_scale: 1,
        rotation: 0,
        reverse: [1, 1],
        scaleLock: true
      };
      commitBook($mainBook, null);
      $mainBook = $mainBook;
    }
  }

  function onClickAway() {
    if (busy) { return; }
    const t = $imageGeneratorTarget;
    $imageGeneratorTarget = null;
    t.prompt = prompt;
  }
</script>

<div class="drawer-outer">
  <Drawer
    open={$imageGeneratorTarget != null}
    placement="right"
    size="720px"
    on:clickAway={onClickAway}
  >

  <TabGroup>
    <Tab bind:group={tabSet} name="tab1" value={0}>Dall・E 3</Tab>
    <Tab bind:group={tabSet} name="tab2" value={1}>Stable Diffusion</Tab>
    <Tab bind:group={tabSet} name="tab3" value={2}><span class="tab"><img src={feathralIcon} alt="feathral" width=24 height=24/>Feathral</span></Tab>
    <!-- Tab Panels --->
    <svelte:fragment slot="panel">
      {#if tabSet === 0}
        <ImageGeneratorDalle3 bind:busy={busy} bind:prompt={prompt} bind:gallery={gallery} bind:chosen={chosen}/>
        {:else if tabSet === 1}
        <ImageGeneratorStableDiffusion bind:busy={busy} bind:prompt={prompt} bind:gallery={gallery} bind:chosen={chosen}/>
        {:else if tabSet === 2}
        <ImageGeneratorFeathral bind:busy={busy} bind:prompt={prompt} bind:gallery={gallery} bind:chosen={chosen}/>
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
