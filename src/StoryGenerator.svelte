<script lang="ts">
  import { modalStore } from '@skeletonlabs/skeleton';
  import NumberEdit from './NumberEdit.svelte';
  import OpenAI from 'openai';
  import { RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
  import { FrameElement, calculatePhysicalLayout, collectImages, collectLeaves, constraintLeaf, dealImages, findLayoutOf, makeTrapezoidRect } from './lib/layeredCanvas/frameTree.js';
  import { type Page, type Revision, commitPage, revertPage, revisionEqual, undoPageHistory, redoPageHistory } from './pageStore';
  import { newPage, newImagePage, newFileToken, newFile } from "./fileManagerStore";
  import { aiTemplates } from './lib/layeredCanvas/frameExamples';
  import { Bubble } from './lib/layeredCanvas/bubble';
  import { measureVerticalText } from './lib/layeredCanvas/verticalText';
  import { parse as JSONCParse } from 'jsonc-parser';

  //let model = 'gpt-3.5-turbo';
  let model = 'gpt-4';

  const prompt =`
以下の条件に従ったマンガのアイディアを考えてください。
題材：電柱
ページ数：2ページ

フォーマットは以下のような形にしてください。これは例なので、形式だけを参考にし、内容は無視してください。
出力はJSONだけとし、それ以外の文言を含むことは許されません。
4～5コマ程度で1ページとしてください。
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
`;

  const openai = new OpenAI({
    apiKey: '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',
    dangerouslyAllowBrowser: true
  });

  async function generate_AI() {
    console.log(prompt);
    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
        model: model,
    });

    console.log("RESULT");
    console.log(chatCompletion.choices[0].message.content);
    return JSONCParse(chatCompletion.choices[0].message.content);
  }

  async function generate_mock() {
    const s = JSON.parse(`
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
            ["Mom", "お父さんの誕生日ケーキを\\n作ろうと思ったのに、\\n力が足りないのよ。"]
          ]
        },
        {
          "description": "Mia unveils what she was hiding behind her back -- a box full of cake ingredients.",
          "bubbles": [
            ["Mia", "どうぞ！\\n学校から帰る途中で\\nパン屋さんで買ったんだよ。"]
          ]
        }
      ]
    }
  ]
}`);
    return s;
  }

  async function generate() {
    createPage(await generate_AI());
    // createPage(generate_mock());
  }

  async function createPage(s: any) {
    const source = s.pages[0];
    const page = newPage("ai-", 0);
    const n = source.scenes.length;
    console.log(n);
    page.frameTree = FrameElement.compile(aiTemplates[n - 2]);
    pourScenario(page, source);
    $newFileToken = page;
  }

  function pourScenario(page: Page, s: any) { // TODO: 型が雑
    const paperLayout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
    console.log(page.frameTree);
    const leaves = collectLeaves(page.frameTree);
    s.scenes.forEach((scene: any, index: number) => {
      const leaf = leaves[index];
      leaf.prompt = scene.description;

      const layout = findLayoutOf(paperLayout, leaf);
      const r = makeTrapezoidRect(layout.corners);
      const c = [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
      const n = scene.bubbles.length;
      scene.bubbles.forEach((b:any, i:number) => {
        const bubble = new Bubble();
        bubble.text = b[1];
        bubble.initOptions();
        const cc = [r[0] + (r[2] - r[0]) * (i+1) / (n+1), (r[1] + r[3]) / 2];
        bubble.move(cc);
        calculateFitBubbleSize(bubble);
        page.bubbles.push(bubble);
      })
    });
  }

  function calculateFitBubbleSize(bubble: Bubble) {
    const baselineSkip = bubble.fontSize * 1.5;
    const charSkip = bubble.fontSize;
    let size =[0,0];
    const m = measureVerticalText(null, Infinity, bubble.text, baselineSkip, charSkip, false);
    size = [Math.floor(m.width*1.4), Math.floor(m.height*1.4)];
    bubble.size = size;
  }

</script>

<div class="page-container">
  <fieldset>
    <div>
      <label for="openai-key">OpenAI Key</label>
      <input type="text" id="openai-key" name="openai-key" placeholder="OpenAI Key" />
    </div>
    <div>
      <label for="model">GPT モデル</label>
      <div class="toggle" id="model">
        <RadioGroup active="variant-filled-primary" hover="hover:variant-soft-primary">
          <RadioItem bind:group={model} name="justify" value={'gpt-3.5-turbo'}>GPT-3.5</RadioItem>
          <RadioItem bind:group={model} name="justify" value={'gpt-4'}>GPT-4</RadioItem>
        </RadioGroup>
      </div>
    </div>
    <div>
      <label for="prompt">お題</label>
      <textarea id="prompt" name="prompt" placeholder="お題" />
    </div>
    <div>
      <label for="page">ページ数</label>
      <div class="number-box" id="page">
        <NumberEdit value={1}/>
      </div>
    </div>

    <div class="button-panel">
      <button class="button btn variant-filled-primary px-2 py-2" on:click={generate}>生成</button>
      <button class="button btn variant-filled-secondary px-2 py-2" on:click={() => modalStore.close()}>back</button>
    </div>

  </fieldset>
</div>

<style>
  .page-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  fieldset {
    background-color: #fff;
    width: 600px;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px;
    gap: 16px;
  }
  fieldset div {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
  }
  label {
    order: 1;
    width: 10em;
    padding-right: 0.5em;
  }
  input, textarea {
    order: 2;
    flex: 1 1 auto;
    border: 1px solid #ccc;
    padding: 4px;
  }  
  textarea {
    height: 100px;
  }
  .toggle {
    order: 2;
    flex: 1 1 auto;
    width: auto;
  }
  .number-box {
    order: 2;
    flex: 1 1 auto;
    border: 1px solid #ccc;
    width: auto;
    height: 32px;
  }
  .button-panel {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 100%;
    gap: 16px;
  }
  .button {
    margin-top: 16px;
    bottom: 8px;
    right: 8px;
    z-index: 1;
    cursor: pointer;
    color: #fff;
    width: 160px;
  }
</style>