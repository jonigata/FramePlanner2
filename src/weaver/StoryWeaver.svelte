<script lang="ts">
  import { SvelteFlow, Background, BackgroundVariant, type SnapGrid, type IsValidConnection, type Connection, type Edge } from '@xyflow/svelte';
  import { WeaverNode, weaverNodeInputType, weaverNodeOutputType } from './weaverStore';
  import { modalStore } from '@skeletonlabs/skeleton';
  import { setContext, tick } from 'svelte';
  import { writable } from 'svelte/store';
  import { buildStoryWeaverGraph } from './storyWeaverModels';
  import ButtonEdge from './ButtonEdge.svelte';
  import StoryWeaverNode from './StoryWeaverNode.svelte';
  import StoryWeaverInspector from './StoryWeaverInspector.svelte';

  import '../box.css';
  import '@xyflow/svelte/dist/style.css';

  let models = buildStoryWeaverGraph();
  let { aiDrafter, manualDrafter, aiStoryboarder, manualStoryboarder, pageGenerator } = models;
  let selected = writable(manualDrafter);
  let apiKey: string = '';
  const aiModel = 'gpt-4';

  const nodeTypes = {
    storyWeaverNode: StoryWeaverNode,
    inspector: StoryWeaverInspector,
  };
  const edgeTypes = {
    buttonedge: ButtonEdge,
  };

  const rawNodes = [];
  for (let [key, value] of Object.entries(models)) {
    rawNodes.push({
      id: key,
      type: 'storyWeaverNode',
      data: { model: value },
      position: value.initialPosition,
    });
  }
  rawNodes.push({
      id: 'inspector',
      type: 'inspector',
      data: { model: $selected },
      hidden: false,
      position: { x:380, y:400 },
      dragHandle: '.drag-handle',
    });

  const nodes = writable(rawNodes);
 
  // same for edges
  const rawEdges: Edge[] = [];
  for (let [key, value] of Object.entries(models)) {
    for (let anchor of value.extractors) {
      if (anchor.opposite == null) { continue; } 
      rawEdges.push({
        id: `${key}-${anchor.opposite.node.id}`,
        type: 'buttonedge',
        source: key,
        sourceHandle: anchor.id,
        target: anchor.opposite.node.id,
        targetHandle: anchor.opposite.id,
      });
    }
  }
  console.log(rawEdges);
/*
  const edges = writable([
    {
      id: '1-3',
      type: 'buttonedge',
      source: 'aiDrafter',
      target: 'aiStoryboarder',
      label: 'Edge Text'
    },
    {
      id: '3-5',
      type: 'buttonedge',
      source: 'aiStoryboarder',
      target: 'pageGenerator',
      label: 'Edge Text'
    }
  ]);
*/
  const edges = writable(rawEdges);

  setContext('selected', selected);

  function disconnect(id: string, sourceHandleId: string, targetHandleId: string) {
    const edge = $edges.find((e) => e.id === id);
    const sourceModel: WeaverNode = models[edge.source];
    sourceModel.disconnect(sourceHandleId);
    edges.update((es) => es.filter((e) => e.id !== id));    
    refresh();
  }
  setContext('disconnect', disconnect);

  function onNodeClick(e: CustomEvent) {
    if (e.detail.node) {
      if (e.detail.node.id === 'inspector') {
      } else {
        $selected = e.detail.node.data.model;
      }
    } else {
      $selected = null;
    }
  }

  async function apply(model: WeaverNode) {
    model.waiting = true;
    $selected = $selected;
    await model.run({ apiKey, aiModel });
    model.waiting = false;
    $selected = $selected;
    await refresh();
  }
  setContext('apply', apply);

  async function refresh() {
    const n = $nodes;
    $nodes = [];
    await tick();
    $nodes = n;
  }

  async function onConnect(event: CustomEvent<{ connection: Connection }>) {
    console.log("onConnect");
    const connection = event.detail.connection;
    const { source, target, sourceHandle, targetHandle } = connection;
    const sourceModel: WeaverNode = models[source];
    const targetModel: WeaverNode = models[target];
    sourceModel.connect(sourceHandle, targetModel.getAnchor(targetHandle));
    await refresh();
  }

  function onConnectStart() {
    console.log("onConnectStart");
  }

  const snapGrid: SnapGrid = [25, 25];

  const isValidConnection: IsValidConnection = (connection) => {  
    const source = $nodes.find((n) => n.id === connection.source);
    const target = $nodes.find((n) => n.id === connection.target);
    const sourceType = weaverNodeOutputType[source.data.model.type];
    const targetType = weaverNodeInputType[target.data.model.type];
    return sourceType === targetType;
  }
</script>

<div class="container vbox">
  <div class="settings hbox rounded-container-token">
    API key
    <input class="variant-ringed-surface rounded-container-token" type="text" bind:value={apiKey}/>
    <div class="hbox grow"></div>
    <button class="btn back-button variant-filled-tertiary" on:click={modalStore.close}>back</button>
  </div>
  <SvelteFlow
    {nodes}
    {edges}
    {nodeTypes}
    {edgeTypes}
    {snapGrid}
    {isValidConnection}
    fitView
    defaultEdgeOptions={{ type: 'buttonedge' }}
    on:nodeclick={onNodeClick}
    on:paneclick={onNodeClick}
    on:connect={onConnect}
    on:connectstart={onConnectStart}
  >
    <Background variant={BackgroundVariant.Dots} />
  </SvelteFlow>
</div>

<style lang="postcss">
  .container {
    width: 100%;
    height: 95vh;
    gap: 16px;
  }
  .settings {
    width: 100%;
    background-color: #fff;
    text-align: left;
    padding: 8px;
    gap: 16px;
  }
  input {
    width: 450px;
    padding: 4px;
    padding-left: 8px;
  }
  .back-button {
    width: 90px;
    height: 32px;
    right: 24px;
    right: 32px;
    z-index: 99999;
    font-family: '源暎エムゴ';
    font-size: 14px;
    color: #fff;
  }
  :global(.svelte-flow .svelte-flow__node .svelte-flow__handle) {
    width: 16px;
    height: 16px;
  }
  :global(.svelte-flow .svelte-flow__node .svelte-flow__handle.draft) {
    background-color: #8d8;
  }
  :global(.svelte-flow .svelte-flow__node .svelte-flow__handle.storyboard) {
    background-color: #88d;
  }

</style>