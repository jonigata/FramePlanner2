<script lang="ts">
  import { SvelteFlow, Background, BackgroundVariant, type SnapGrid, type IsValidConnection, type Connection, type Edge } from '@xyflow/svelte';
  import { WeaverNode, weaverNodeInputType, weaverNodeOutputType, packNode, type NodePack, unpackNode } from './weaverStore';
  import { modalStore, toastStore } from '@skeletonlabs/skeleton';
  import { onMount, setContext, tick } from 'svelte';
  import { writable } from 'svelte/store';
  import { buildStoryWeaverGraph } from './storyWeaverModels';
  import ButtonEdge from './ButtonEdge.svelte';
  import StoryWeaverNode from './StoryWeaverNode.svelte';
  import StoryWeaverInspector from './StoryWeaverInspector.svelte';
  import KeyValueStorage from "../KeyValueStorage.svelte";

  import '../box.css';
  import '@xyflow/svelte/dist/style.css';

  let models = buildStoryWeaverGraph();
  let { aiDrafter, manualDrafter, aiStoryboarder, manualStoryboarder, pageGenerator } = models;
  let selected = writable(aiDrafter);
  let storedApiKey: string = null;
  let apiKey: string = '';
  let keyValueStorage: KeyValueStorage = null;

  //const aiModel = 'gpt-4';
  const aiModel = "gpt-4-1106-preview";

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
      deletable: false,
    });
  }
  rawNodes.push({
      id: 'inspector',
      type: 'inspector',
      data: { model: $selected },
      hidden: false,
      position: { x:380, y:325 },
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

  async function applyAux(model: WeaverNode) {
    model.waiting = true;
    $selected = $selected;
    try {
      await model.run({ apiKey, aiModel });
      const r = packNode(model);
      await keyValueStorage.set(`node:${model.id}`, JSON.stringify(r));
      console.log(r);
    }
    catch(e) {
      console.log(e);
      toastStore.trigger({message: e.message, timeout: 15000})
      model.waiting = false;
      $selected = $selected;
      await refresh();
      throw e;
    }
    model.waiting = false;
    $selected = $selected;
    await refresh();
  }
  async function apply(model: WeaverNode) {
    try {
      await applyAux(model);
    }
    catch {
    }
  }
  setContext('apply', apply);

  async function fullApply(model: WeaverNode) {
    while (model) {
      try {
        $selected = model;
        await refresh();
        await applyAux(model);
        model = model.extractors[0]?.opposite?.node;
      }
      catch(e) {
        break;
      }
    }
  }
  setContext('fullApply', fullApply);

  async function fullReset(model: WeaverNode) {
    while (model) {
      model.reset();
      await refresh();
      model = model.extractors[0]?.opposite?.node;
    }
  }
  setContext('fullReset', fullReset);


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

  $: onUpdateApiKey(apiKey);
  async function onUpdateApiKey(ak: string) {
    if (!keyValueStorage || ak === storedApiKey) { return; }
    await keyValueStorage.set("apiKey", ak);
    storedApiKey = ak;
  }

  function resetStorage() {
    if (confirm("StoryWeaverのパラメータを全てリセットしますか？")) {
      keyValueStorage.clear();
      location.reload();
    }
  }

  onMount(async () => {
    await keyValueStorage.waitForReady();
    storedApiKey = await keyValueStorage.get("apiKey") ?? '';
    apiKey = storedApiKey;

    for (let node of $nodes) {
      const r = await keyValueStorage.get(`node:${node.id}`);
      if (r) {
        const p: NodePack = JSON.parse(r);
        unpackNode(node.data.model, p);
      }
    }
    await refresh();
  });
</script>

<div class="container vbox">
  <div class="settings hbox rounded-container-token">
    API key
      <input class="variant-ringed-surface rounded-container-token" type="password" autocomplete="off" bind:value={apiKey}/>
    <div class="hbox grow"></div>
    <button class="btn reset-button variant-filled-warning" on:click={resetStorage}>パラメータリセット</button>
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

  <KeyValueStorage bind:this={keyValueStorage} dbName={"story-weaver"} storeName={"preferences"}/>
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
  .reset-button {
    width: 140px;
    height: 32px;
    right: 24px;
    right: 32px;
    z-index: 99999;
    font-family: '源暎エムゴ';
    font-size: 14px;
    color: #fff;
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