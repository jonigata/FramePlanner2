<script lang="ts">
  import { Node, Svelvet } from 'svelvet';
  import { WeaverNode, weaverRefreshToken, createPage } from './weaverStore';
  import StoryWeaverNode from './StoryWeaverNode.svelte';
  import StoryWeaverInspector from './StoryWeaverInspector.svelte';
  import '../box.css';
  import { modalStore } from '@skeletonlabs/skeleton';
  import { onMount, tick } from 'svelte';
  import { buildStoryWeaverGraph } from './storyWeaverModels';

  let apiKey = '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';
  let aiModel = 'gpt-4';

  let inspector: StoryWeaverInspector = null;
  let inspectorPosition = {x:500,y:650};

  let nodes = buildStoryWeaverGraph();
  let selected = nodes.manualDrafter;
  let aiDrafter = nodes.aiDrafter;
  let manualDrafter = nodes.manualDrafter;
  let aiStoryboarder = nodes.aiStoryboarder;
  let manualStoryboarder = nodes.manualStoryboarder;
  let pageGenerator = nodes.pageGenerator;

  $: onRefresh($weaverRefreshToken);
  function onRefresh(f: boolean) {
    if (!f) return;
    console.log("onRefresh");
    $weaverRefreshToken = false;

    aiDrafter = aiDrafter;
    manualDrafter = manualDrafter;
    aiStoryboarder = aiStoryboarder;
    manualStoryboarder = manualStoryboarder;
    pageGenerator = pageGenerator;
  }

  async function onNodeClicked(e: CustomEvent) {
    const model = e.detail;
    logNetwork();
    selected = null;
    await tick();
    selected = model;
  }

  async function apply(e: CustomEvent) {
    const model: WeaverNode = e.detail;
    model.waiting = true;
    inspector.refresh();
    await model.run();
    model.waiting = false;
    inspector.refresh();
    $weaverRefreshToken = true;
  }

  function onConnection(e: CustomEvent) {
    const src = getNodeAndAnchor(e.detail.sourceAnchor.id);
    const tgt = getNodeAndAnchor(e.detail.targetAnchor.id);
    console.log("onConnection", src, tgt);
    nodes[src.node].connect(src.anchor, nodes[tgt.node].getAnchor(tgt.anchor));
    logNetwork();
    $weaverRefreshToken = true;
  }

  function onDisconnection(e: CustomEvent) {
    const src = getNodeAndAnchor(e.detail.sourceAnchor.id);
    const tgt = getNodeAndAnchor(e.detail.targetAnchor.id);
    nodes[src.node].disconnect(src.anchor);
    logNetwork();
    $weaverRefreshToken = true;
  }

  function logNetwork() {
    // console.log("logNetwork");
    // console.trace();
    for (let node of Object.values(nodes)) {
      // console.log(node.id, JSON.stringify(node.links));
    }
  }

  function getNodeAndAnchor(str: string) {
    const matches = str.match(/A-(\w+)\/N-(\w+)/);
    return {
      node: matches[2],
      anchor: matches[1],
    };
  }

  onMount(() => {
    $weaverRefreshToken = true;
  });

</script>

<div class="container">
  <Svelvet id="my-canvas"  on:connection={onConnection} on:disconnection={onDisconnection} TD>
    <StoryWeaverNode model={aiDrafter} position={{x: 100, y: 200}} on:nodeClicked={onNodeClicked}/>
    <StoryWeaverNode model={manualDrafter} position={{x: 400, y: 200}} on:nodeClicked={onNodeClicked}/>
    <StoryWeaverNode model={aiStoryboarder} position={{x: 100, y: 500}} on:nodeClicked={onNodeClicked}/>
    <StoryWeaverNode model={manualStoryboarder} position={{x: 400, y: 500}} on:nodeClicked={onNodeClicked}/>
    <StoryWeaverNode model={pageGenerator} position={{x: 250, y: 800}} on:nodeClicked={onNodeClicked}/>
    {#if selected}
      <Node id="inspector" bind:position={inspectorPosition} inputs={0} outputs={0}>
        <StoryWeaverInspector model={selected} on:apply={apply} bind:this={inspector}/>
      </Node>
    {/if}
  </Svelvet>
  <button class="btn back-button" on:click={() => modalStore.close()}>back</button>
</div>

<style lang="postcss">
  .back-button {
    @apply variant-filled-tertiary;
    position: absolute;
    width: 180px;
    height: 60px;
    bottom: 32px;
    right: 32px;
    z-index: 99999;
    font-family: '源暎エムゴ';
    font-size: 26px;
    color: #fff;
  }
</style>