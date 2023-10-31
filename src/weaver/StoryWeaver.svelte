<script lang="ts">
  import { Node, Svelvet, Minimap, Controls, Anchor } from 'svelvet';
  import { WeaverAnchor, WeaverArg, WeaverNode, weaverRefreshToken, createPage } from './weaverStore';
  import StoryWeaverNode from './StoryWeaverNode.svelte';
  import StoryWeaverInspector from './StoryWeaverInspector.svelte';
  import '../box.css';
  import { modalStore, toastStore } from '@skeletonlabs/skeleton';
  import { onMount, tick } from 'svelte';
  import OpenAI from 'openai';
  import { runTransaction } from 'firebase/database';
  import { parse as JSONCParse } from 'jsonc-parser';
  import { newPage, newBookToken } from "../fileManagerStore";

  let apiKey = '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';
  let aiModel = 'gpt-4';

  let inspector: StoryWeaverInspector = null;
  let inspectorPosition = {x:500,y:650};

  const aiDrafterDefaultPrompt = 
`マンガのアイディアを考えてください。
題材：\${theme}
ページ数：\${pageNumber}ページ
1ページあたり\${panelCount}コマ程度で構成してください。

考えた内容以外の情報は出力しないでください。`;

  const aiStoryboarderDefaultPrompt = 
`# Task description

マンガのアイディアをフォーマットしてください。
ページ数は最後に伝えます。

フォーマットは以下のような形にしてください。これは例なので、形式だけを参考にし、内容は無視してください。
出力はJSONだけとし、それ以外の文言を含むことは許されません。
セリフは10文字前後にし、適切に改行コード(\\n)を入れて一行8文字以下にしてください。
"description"は、画像生成AIにわたすプロンプトを想定し、視覚的情景を重視してセリフを含めないようにしてください。人名は視覚的属性に置き換えてください。可能な限り詳細にしてください。

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
1ページあたりのコマ数: \${panelCount}コマ程度

元になるストーリーでは、1ページあたりのコマ数が多いことがありますが、
その場合、冗長なコマを削る・一コマに複数のセリフを収めるなどして指定通り圧縮してください。

# Input story

\${story}
`;


  let aiDrafter = new WeaverNode(
    'drafter', 'aiDrafter', "AI原案作成", 
    [], [new WeaverAnchor('stdout','draft')], 
    async (m) => {
      return await runAi(m.args[3].value, { 
        theme: m.args[0].value,
        pageNumber: m.args[1].value,
        panelCount: m.args[2].value,
      });
    },
    (m) => {
      let s = '';
      if (!m.args[0].value) { s += 'お題がありません\n'; }
      if (!m.args[1].value) { s += 'ページ数がありません\n'; }
      if (!m.args[2].value) { s += 'コマ/ページがありません\n'; }
      if (!m.args[3].value) { s += 'プロンプトがありません\n'; }
      return s;
    },
    [
      new WeaverArg('smalltext', 'theme', 'お題', false, 'おまかせ'),
      new WeaverArg('number', 'pageCount', 'ページ数', false, 1),
      new WeaverArg('number', 'panelCount', 'コマ/ページ', false, 5),
      new WeaverArg('largetext', 'prompt', 'プロンプト', true, aiDrafterDefaultPrompt),
    ],
    );
  let manualDrafter = new WeaverNode(
    'drafter', 'manualDrafter', "原案手動入力", 
    [], [new WeaverAnchor('stdout','draft')], 
    async (m) => m.args[0].value,
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
    async (m) => {
      return await runAi(m.args[2].value, { 
        pageNumber: m.args[0].value,
        panelCount: m.args[1].value,
        story: m.getInput(0)
      });
    },
    (m) => {
      let s = '';
      if (!m.args[0].value) { s += 'ページ数がありません\n'; }
      if (!m.args[1].value) { s += 'コマ/ページがありません\n'; }
      if (!m.args[2].value) { s += 'プロンプトがありません\n'; }
      return s;
    },
    [
      new WeaverArg('number', 'pageCount', 'ページ数', false, 1),
      new WeaverArg('number', 'panelCount', 'コマ/ページ', false, 5),
      new WeaverArg('largetext', 'prompt', 'プロンプト', true, aiStoryboarderDefaultPrompt),
    ]);
  let manualStoryboarder = new WeaverNode(
    'storyboarder', 'manualStoryboarder', "手動ネーム作成", 
    [], [new WeaverAnchor('stdout','storyboard')], 
    async (m) => m.args[0].value,
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
    async (m) => {
      const storyBoard = JSONCParse(m.getInput(0));

      const book = { title: 'AI作成', pages: [] };
      for (let i = 0; i < storyBoard.pages.length; i++) {
        console.log(storyBoard.pages[i]);
        const page = await createPage(storyBoard.pages[i]);
        book.pages.push(page);
      }
      $newBookToken = book;
      toastStore.trigger({ message: `ページを作成しました`, timeout: 40000, classes: "z-[999]"});
    },
    (m) => '',
    [
    ]);

  aiDrafter.connect('stdout', aiStoryboarder.getAnchor('stdin'));
  manualStoryboarder.connect('stdout', pageGenerator.getAnchor('stdin'));

  let selected = manualDrafter;

  const nodes = [aiDrafter, manualDrafter, aiStoryboarder, manualStoryboarder, pageGenerator];
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
    nodeDic[src.node].connect(src.anchor, nodeDic[tgt.node].getAnchor(tgt.anchor));
    logNetwork();
    $weaverRefreshToken = true;
  }

  function onDisconnection(e: CustomEvent) {
    const src = getNodeAndAnchor(e.detail.sourceAnchor.id);
    const tgt = getNodeAndAnchor(e.detail.targetAnchor.id);
    nodeDic[src.node].disconnect(src.anchor);
    logNetwork();
    $weaverRefreshToken = true;
  }

  function logNetwork() {
    // console.log("logNetwork");
    // console.trace();
    for (let node of nodes) {
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

  async function runAi(promptTemplate: string, params: { [key: string]: any }): Promise<string> {
    return callAi(apiKey, aiModel, replaceKeywords(promptTemplate, params));
  }

  function replaceKeywords(input: string, replacements: { [key: string]: string }): string {
    return input.replace(/\$\{(\w+)\}/g, (_, keyword) => {
        return replacements[keyword] || _;
    });

  }  

  async function callAi(apiKey: string, model: string, prompt: string): Promise<string> {
    const openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });

    console.log("callAi PROMPT: ", prompt);
    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: model,
    });

    console.log("callAi RESULT: ", chatCompletion.choices[0].message.content);
    return chatCompletion.choices[0].message.content;
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