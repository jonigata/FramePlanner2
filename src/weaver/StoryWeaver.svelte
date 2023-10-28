<script lang="ts">
  import { Node, Svelvet, Minimap, Controls, Anchor } from 'svelvet';
  import { WeaverAnchor, WeaverArg, WeaverNode, weaverRefreshToken } from './weaverStore';
  import StoryWeaverNode from './StoryWeaverNode.svelte';
  import StoryWeaverInspector from './StoryWeaverInspector.svelte';
  import '../box.css';
  import { toastStore } from '@skeletonlabs/skeleton';
  import { onMount } from 'svelte';

  let inspector: StoryWeaverInspector = null;

  const aiDrafterDefaultPrompt = 
`マンガのアイディアを考えてください。
題材：\${theme}
ページ数：\${pageNumber}ページ
1ページあたり\${panelCount}コマ程度で構成してください。

考えた内容以外の情報は出力しないでください。`;

  const aiStoryboarderDefaultPrompt = 
`# Task description

マンガのアイディアをフォーマットしてください。
題材とページ数は最後に伝えます。

フォーマットは以下のような形にしてください。これは例なので、形式だけを参考にし、内容は無視してください。
出力はJSONだけとし、それ以外の文言を含むことは許されません。
セリフは10文字前後にし、適切に改行コード(\\n)を入れて一行7～8文字まで程度になるようにしてください。
"description"は、画像生成AIにわたすプロンプトを想定してください。
{
"characters": {
  "Mia": "girl",
  "Mom": "woman",
  "Dad": "man"
},
"pages": [
  {
    "scenes": [
      {
        "description": "The mood is tense in the household. Mom looks worried and Dad is calming her down.",
        "bubbles": [
          ["Mom", "ああ、だめだわ。\\nケーキの材料が足りないわ。"],
          ["Dad", "大丈夫だよ、\\n何とかなるさ。"]
        ]
      },
      {
        "description": "Mia enters the living room with her hands behind her back.",
        "bubbles": [
          ["Mia", "ヘイ、\\n何が問題なの？"]
        ]
      },
      {
        "description": "Mom sighs and tells Mia their problem.",
        "bubbles": [
          ["Mom", "お父さんの誕生日ケーキを\\n作ろうと思ったのに、\\n力が足りないのよ。"],
        ]
      },
      {
        "description": "Mia unveils what she was hiding behind her back -- a box full of cake ingredients.",
        "bubbles": [
          ["Mia", "どうぞ！\\n学校から帰る途中で\\nパン屋さんで買ったんだよ。"]
        ]
      }
    ]
  },
  {
    "scenes": [
      {
        "description": "Everyone in the room is surprised and Mom is relieved.",
        "bubbles": [
          ["Mom", "ありがとう、ミア。\\n本当に助かったわ。"],
          ["Dad", "さすがミア！"]
        ]
      },
      {
        "description": "Mia smiles and starts gathering the ingredients.",
        "bubbles": [
          ["Mia", "一緒に作ろうよ、\\nお母さん！"]
        ]
      },
      {
        "description": "Mom nods and they start making the cake together. Dad watches them with a smile on his face.",
        "bubbles": [
          ["Dad", "良い一日だ。"],
          ["Mom", "本当にそうね。"]
        ]
      }
    ]
  }
]
}

# Task condition

ページ数：\${pageNumber}ページ
元になるストーリー：\${story}
1ページあたりのコマ数: \${panelCount}コマ程度

元になるストーリーでは、1ページあたりのコマ数が多いことがありますが、
その場合、冗長なコマを削る・一コマに複数のセリフを収めるなどして指定通り圧縮してください。

# Input story
`;


  let aiDrafter = new WeaverNode(
    'drafter', 'aiDrafter', "AI原案作成", 
    [], [new WeaverAnchor('stdout','draft')], 
    () => 'ok',
    (m) => {
      let s = '';
      if (!m.args[0].value) { s += 'ページ数がありません\n'; }
      if (!m.args[1].value) { s += 'コマ/ページがありません\n'; }
      if (!m.args[2].value) { s += 'プロンプトがありません\n'; }
      return s;
    },
    [
      new WeaverArg('number', 'pageCount', 'ページ数', false, 1),
      new WeaverArg('number', 'panelCount', 'コマ/ページ', false, 1),
      new WeaverArg('largetext', 'prompt', 'プロンプト', true, aiDrafterDefaultPrompt),
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
      new WeaverArg('largetext', 'draft', '原案', false, '')
    ]);

  let aiStoryboarder = new WeaverNode(
    'storyboarder', 'aiStoryboarder', "AIネーム作成", 
    [new WeaverAnchor('stdin','draft')], [new WeaverAnchor('stdout','storyboard')], 
    () => 'ok',
    (m) => {
      let s = '';
      if (!m.args[0].value) { s += 'ページ数がありません\n'; }
      if (!m.args[1].value) { s += 'コマ/ページがありません\n'; }
      if (!m.args[2].value) { s += 'プロンプトがありません\n'; }
      return s;
    },
    [
      new WeaverArg('number', 'pageCount', 'ページ数', false, 1),
      new WeaverArg('number', 'panelCount', 'コマ/ページ', false, 1),
      new WeaverArg('largetext', 'prompt', 'プロンプト', true, aiDrafterDefaultPrompt),
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
      new WeaverArg('largetext', 'storyboard', 'ネーム', false, '')
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