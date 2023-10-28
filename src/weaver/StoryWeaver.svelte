<script lang="ts">
  import { Node, Svelvet, Minimap, Controls, Anchor } from 'svelvet';
  import { WeaverAnchor, WeaverArg, WeaverNode, weaverRefreshToken } from './weaverStore';
  import StoryWeaverNode from './StoryWeaverNode.svelte';
  import StoryWeaverInspector from './StoryWeaverInspector.svelte';
  import '../box.css';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { onMount } from 'svelte';

  let inspector: StoryWeaverInspector = null;

  let aiDrafter = new WeaverNode(
    'drafter', 'aiDrafter', "AI原案作成", 
    [], [new WeaverAnchor('stdout','draft')], 
    () => 'ok',
    (m) => {
      let s = '';
      if (!m.args[0].value) { s += 'プロンプトがありません\n'; }
      if (!m.args[1].value) { s += 'ページ数がありません\n'; }
      if (!m.args[2].value) { s += 'コマ/ページがありません\n'; }
      return s;
    },
    [
      new WeaverArg('largetext', 'prompt', 'プロンプト', ''),
      new WeaverArg('number', 'pageCount', 'ページ数', 1),
      new WeaverArg('number', 'panelCount', 'コマ/ページ', 1),
    ],
    );
  let manualDrafter = new WeaverNode(
    'drafter', 'manualDrafter', "原案手動入力", 
    [], [new WeaverAnchor('stdout','draft')], 
    (m) => m.args[0].value,
    (m) => {
      let s = '';
      if (!m.args[0].value) { s += '原案がありません\n'; }
      return s;
    },
    [
      new WeaverArg('largetext', 'draft', '原案', '')
    ]);

    let aiStoryboarder = new WeaverNode(
    'storyboarder', 'aiStoryboarder', "AIネーム作成", 
    [new WeaverAnchor('stdin','draft')], [new WeaverAnchor('stdout','storyboard')], 
    () => 'ok',
    (m) => {
      let s = '';
      if (!m.args[0].value) { s += 'ページ数がありません\n'; }
      if (!m.args[1].value) { s += 'コマ/ページがありません\n'; }
      return s;
    },
    [
      new WeaverArg('number', 'pageCount', 'ページ数', 1),
      new WeaverArg('number', 'panelCount', 'コマ/ページ', 1),
    ]);
  let manualStoryboarder = new WeaverNode(
    'storyboarder', 'manualStoryboarder', "手動ネーム作成", 
    [], [new WeaverAnchor('stdout','storyboard')], 
    (m) => m.args[0].value,
    (m) => {
      let s = '';
      if (!m.args[0].value) { s += 'ネームがありません\n'; }
      return s;
    },
    [
      new WeaverArg('largetext', 'storyboard', 'ネーム', '')
    ]);
  let pageGenerator = new WeaverNode(
    'generator', 'pageGenerator', "レイアウト生成",
    [new WeaverAnchor('stdin','storyboard')], [], 
    () => 'ok',
    (m) => '',
    [
    ]);

  manualDrafter.connect('stdout', aiStoryboarder.getAnchor('stdin'));
  aiStoryboarder.connect('stdout', pageGenerator.getAnchor('stdin'));

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

  function onConnection(e: CustomEvent) {
    const src = getNodeAndAnchor(e.detail.sourceAnchor.id);
    const tgt = getNodeAndAnchor(e.detail.targetAnchor.id);
    /*
    nodeDic[src.node].getAnchor(src.anchor).push(nodeDic[tgt.node].getAnchor(tgt.anchor));

    nodeDic[e.detail.sourceNode.id].linkTo.push(e.detail.targetNode.id);
    nodeDic[e.detail.targetNode.id].linkTo.push(e.detail.sourceNode.id);
    */
  }

  function onDisconnection(e: CustomEvent) {
    console.log(e.detail);
    /*
    nodeDic[e.detail.sourceNode.id].linkTo = nodeDic[e.detail.sourceNode.id].linkTo.filter((id) => id !== e.detail.targetNode.id);
    nodeDic[e.detail.targetNode.id].linkTo = nodeDic[e.detail.targetNode.id].linkTo.filter((id) => id !== e.detail.sourceNode.id);
    */
  }

  function getNodeAndAnchor(str: string) {
    const matches = str.match(/A-(\w+)\/N-(\w+)/);
    return {
      node: matches[1],
      anchor: matches[2],
    };
  }

  onMount(() => {
    $weaverRefreshToken = true;
  });

</script>

<Svelvet id="my-canvas"  on:connection={onConnection} on:disconnection={onDisconnection} TD>
  <StoryWeaverNode model={aiDrafter} position={{x: 100, y: 200}} on:nodeClicked={onNodeClicked}/>
  <StoryWeaverNode model={manualDrafter} position={{x: 500, y: 200}} on:nodeClicked={onNodeClicked}/>
  <StoryWeaverNode model={aiStoryboarder} position={{x: 100, y: 500}} on:nodeClicked={onNodeClicked}/>
  <StoryWeaverNode model={manualStoryboarder} position={{x: 500, y: 500}} on:nodeClicked={onNodeClicked}/>
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