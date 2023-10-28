<script lang="ts">
  import { Node, Svelvet, Minimap, Controls, Anchor } from 'svelvet';
  import { WeaverNode, weaverRefreshToken } from './weaverStore';
  import StoryWeaverNode from './StoryWeaverNode.svelte';
  import StoryWeaverInspector from './StoryWeaverInspector.svelte';
  import '../box.css';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { onMount } from 'svelte';

  let inspector: StoryWeaverInspector = null;

  let aiDrafter = new WeaverNode(
    'drafter', 'aiDrafter', "AI原案作成", 
    [], ['draft'], 
    [
      {type: 'largetext', label: 'プロンプト', name: 'prompt'},
      {type: 'number', label: 'ページ数', name: 'pageCount'},
      {type: 'number', label: 'コマ/ページ', name: 'panelCount'},
    ],
    () => 'ok',
    (m) => {
      let s = '';
      if (!m.actualArgs[0]) { s += 'プロンプトがありません\n'; }
      if (!m.actualArgs[1]) { s += 'ページ数がありません\n'; }
      if (!m.actualArgs[2]) { s += 'コマ/ページがありません\n'; }
      return s;
    },
    []);
  let manualDrafter = new WeaverNode(
    'drafter', 'manualDrafter', "原案手動入力", 
    [], ['draft'], 
    [
      {type: 'largetext', label: '原案', name: 'draft'}
    ],
    (m) => m.actualArgs[0],
    (m) => {
      let s = '';
      if (!m.actualArgs[0]) { s += '原案がありません\n'; }
      return s;
    },
    ['aiStoryboarder']);

  let aiStoryboarder = new WeaverNode(
    'storyboarder', 'aiStoryboarder', "AIネーム作成", 
    ['draft'], ['storyboard'], 
    [
      {type: 'number', label: 'ページ数', name: 'pageCount'},
      {type: 'number', label: 'コマ/ページ', name: 'panelCount'},
    ],
    () => 'ok',
    (m) => {
      let s = '';
      if (!m.actualArgs[0]) { s += 'ページ数がありません\n'; }
      if (!m.actualArgs[1]) { s += 'コマ/ページがありません\n'; }
      return s;
    },
    ['pageGenerator']);
  let pageGenerator = new WeaverNode(
    'generator', 'pageGenerator', "レイアウト生成",
     ['storyboard'], [],
    [
    ],
    () => 'ok',
    (m) => null,
    []);
  
  let selected = manualDrafter;

  const nodes = [aiDrafter, manualDrafter, aiStoryboarder, pageGenerator];
  const nodeDic = nodes.reduce((acc, node) => {
    acc[node.id] = node;
    return acc;
  }, {});

  $: onRefresh($weaverRefreshToken);
  function onRefresh(f: boolean) {
    if (!f) return;
    console.log("onRefresh");
    $weaverRefreshToken = false;

    aiDrafter = aiDrafter;
    manualDrafter = manualDrafter;
    aiStoryboarder = aiStoryboarder;
    pageGenerator = pageGenerator;
  }

  function onNodeClicked(e: CustomEvent) {
    const model = e.detail;
    console.log(model);
    selected = model;
    /*
    if (model.ready) {
      model.run();
    } else {
      toastStore.trigger({ message: '入力が不足しています', timeout: 1500});
    }
    $weaverRefreshToken = true;
*/
  }

  function apply(e: CustomEvent) {
    const model = e.detail;
    model.run();
    inspector.refresh();
    $weaverRefreshToken = true;
  }

  function reweave() {
    const h = {};
    for (const node of nodes) {
      h[node.id] = new Set();
    }
    for (const node of nodes) {
      for (const link of node.linkTo) {
        h[node.id].add(link);
        h[link].add(node.id);
      }
    }
    console.log(h);
    for (const node of nodes) {
      node.linkTo = [...h[node.id]];
    }
  }

  function onConnection(e: CustomEvent) {
    /*
    nodeDic[e.detail.sourceNode.id].linkTo.push(e.detail.targetNode.id);
    nodeDic[e.detail.targetNode.id].linkTo.push(e.detail.sourceNode.id);
    */
  }

  function onDisconnection(e: CustomEvent) {
    /*
    nodeDic[e.detail.sourceNode.id].linkTo = nodeDic[e.detail.sourceNode.id].linkTo.filter((id) => id !== e.detail.targetNode.id);
    nodeDic[e.detail.targetNode.id].linkTo = nodeDic[e.detail.targetNode.id].linkTo.filter((id) => id !== e.detail.sourceNode.id);
    */
  }

  onMount(() => {
    reweave();
    $weaverRefreshToken = true;
  });

</script>

<Svelvet id="my-canvas"  on:connection={onConnection} on:disconnection={onDisconnection} TD>
  <StoryWeaverNode model={aiDrafter} position={{x: 100, y: 200}} on:nodeClicked={onNodeClicked}/>
  <StoryWeaverNode model={manualDrafter} position={{x: 500, y: 200}} on:nodeClicked={onNodeClicked}/>
  <StoryWeaverNode model={aiStoryboarder} position={{x: 300, y: 500}} on:nodeClicked={onNodeClicked}/>
  <StoryWeaverNode model={pageGenerator} position={{x: 300, y: 800}} on:nodeClicked={onNodeClicked}/>
  {#if selected}
    <Node id="inspector" position={{x:0,y:0}} inputs={0} outputs={0}>
      <StoryWeaverInspector model={selected} on:apply={apply} bind:this={inspector}/>
    </Node>
  {/if}
  <Controls />
</Svelvet>

<style lang="postcss">
</style>