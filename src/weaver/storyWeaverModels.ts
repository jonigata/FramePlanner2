import { WeaverAnchor, WeaverArg, WeaverNode, createPage } from './weaverStore';
import { newBookToken } from "../fileManagerStore";
import { toastStore } from '@skeletonlabs/skeleton';
import OpenAI from 'openai';
import { parse as JSONCParse } from 'jsonc-parser';

export function buildStoryWeaverGraph() {
  let aiDrafter = new WeaverNode(
    'drafter', 'aiDrafter', "AI原案作成", 
    [], [new WeaverAnchor('stdout','draft')], 
    async (m, opts) => {
      return await runAi(
        opts.apiKey,
        opts.aiModel,
        m.args[3].value, 
        { 
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
    {x: 0, y: 0}
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
    ],
    {x: 300, y: 0});

  let aiStoryboarder = new WeaverNode(
    'storyboarder', 'aiStoryboarder', "AIネーム作成", 
    [new WeaverAnchor('stdin','draft')], [new WeaverAnchor('stdout','storyboard')], 
    async (m, opts) => {
      return await runAi(
        opts.apiKey,
        opts.aiModel,
        m.args[2].value, 
        { 
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
    ],
    {x: 0, y: 200});
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
    ],
    {x: 300, y: 200});
  let pageGenerator = new WeaverNode(
    'generator', 'pageGenerator', "レイアウト生成",
    [new WeaverAnchor('stdin','storyboard')], [], 
    async (m) => {
      const storyboard = JSONCParse(m.getInput(0));

      const book = { title: 'AI作成', pages: [] };
      for (let i = 0; i < storyboard.pages.length; i++) {
        console.log(storyboard.pages[i]);
        const page = createPage(storyboard.pages[i], m.args[0].value);
        book.pages.push(page);
      }
      newBookToken.set(book);
      toastStore.trigger({ message: `ページを作成しました`, timeout: 4000, classes: "z-[999]"});
    },
    (m) => '',
    [
      new WeaverArg('smalltext', 'additionalPrompt', '追加画像プロンプト', false, ''),
    ],
    {x: 150, y: 400});

  aiDrafter.connect('stdout', aiStoryboarder.getAnchor('stdin'));
  aiStoryboarder.connect('stdout', pageGenerator.getAnchor('stdin'));

  const nodes = {aiDrafter, manualDrafter, aiStoryboarder, manualStoryboarder, pageGenerator};
  return nodes;
}

const aiDrafterDefaultPrompt = 
`マンガのアイディアを考えてください。
題材：\${theme}
ページ数：\${pageNumber}ページ
1ページあたり\${panelCount}コマ程度で構成してください。

考えた内容以外の情報は出力しないでください。`;

const aiStoryboarderDefaultPrompt = 
`# Task description

後述の「Input Story」をJSONにフォーマットしてください。
ページ数は最後に伝えます。

# Ouput Format

出力はJSONだけとし、それ以外の文言を含むことは許されません。
セリフは10文字前後にし、適切に改行コード(\\n)を入れて一行5文字以下にしてください。
キャラクター設定時に各キャラクターの容姿(appearance)をある程度詳細に設定してください。

"composition"では、以下のルールを守ってください。
- 画像生成AIにわたすプロンプトを想定する
- 詳細な視覚的情景を記述する。
- セリフを決して含めない。
- キャラクターはキャラクター設定で設定した視覚的属性に置き換える。

# Example 

※これは例なので、形式だけを参考にし、内容は完全に無視してください。

{
  "characters": [
    { "name": "Mia", "appearance": "Modern girl in casual attire, with short wavy hair, wearing headphones, holding a smartphone" },
    { "name": "Mom", "appearance": "Contemporary woman, long straight hair, wearing a blazer, carrying a tote bag" },
    { "name": "Dad", "appearance": "Modern man, short curly hair, sporting a smart casual look, with a laptop bag" },
  ],
  "pages": [
    {
      "scenes": [
        {
          "composition": "In a dim living room, a contemporary woman with long straight hair in a blazer looks worried. Beside her, a modern man with short curly hair gently holds her arm, offering comfort.",
          "bubbles": [
            { "owner": "Mom", "speech": "ああ、だめだわ。\\nケーキの材料が足りないわ。"},
            { "owner": "Dad", "speech": "大丈夫だよ、\\n何とかなるさ。"}
          ]
        },
        {
          "composition": "A modern girl with short wavy hair and headphones walks into the living room, something hidden behind her back.",
          "bubbles": [
            { "owner": "Mia", "speech": "ヘイ、\\n何が問題なの？"}
          ]
        },
        {
          "composition": "The contemporary woman with long straight hair faces the modern girl, revealing a troubling situation.",
          "bubbles": [
            { "owner": "Mom", "speech": "お父さんの誕生日ケーキを\\n作ろうと思ったのに、\\n力が足りないのよ。"},
          ]
        },
        {
          "composition": "The modern girl reveals a box full of cake-making ingredients, her eyes filled with hope.",
          "bubbles": [
            { "owner": "Mia", "speech": "どうぞ！\\n学校から帰る途中で\\nパン屋さんで買ったんだよ。" }
          ]
        }
      ]
    },
    {
      "scenes": [
        {
          "composition": "Surprise appears on the faces of the contemporary woman and the modern man in the room, the woman showing relief.",
          "bubbles": [
            { "owner": "Mom", "speech": "ありがとう、ミア。\\n本当に助かったわ。"},
            { "owner": "Dad", "speech": "さすがミア！"}
          ]
        },
        {
          "composition": "The modern girl with short wavy hair smiles brightly, organizing cake ingredients on the table.",
          "bubbles": [
            { "owner": "Mia", "speech": "一緒に作ろうよ、\\nお母さん！"}
          ]
        },
        {
          "composition": "The contemporary woman nods in approval, and they start making the cake together, while the modern man watches with a smile.",
          "bubbles": [
            { "owner": "Dad", "speech": "いい一日だ。" },
            { "owner": "Mom", "speech": "本当にそうね。" }
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


async function runAi(apiKey: string, aiModel: string, promptTemplate: string, params: { [key: string]: any }): Promise<string> {
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

