import { WeaverAnchor, WeaverArg, WeaverNode, weaverRefreshToken, createPage } from './weaverStore';
import { newBookToken } from "../fileManagerStore";
import { toastStore } from '@skeletonlabs/skeleton';
import OpenAI from 'openai';
import { parse as JSONCParse } from 'jsonc-parser';

export function buildStoryWeaverGraph() {
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
      const storyBoard = JSONCParse(m.getInput(0));

      const book = { title: 'AI作成', pages: [] };
      for (let i = 0; i < storyBoard.pages.length; i++) {
        console.log(storyBoard.pages[i]);
        const page = await createPage(storyBoard.pages[i]);
        book.pages.push(page);
      }
      newBookToken.set(book);
      toastStore.trigger({ message: `ページを作成しました`, timeout: 40000, classes: "z-[999]"});
    },
    (m) => '',
    [
    ],
    {x: 150, y: 400});

  aiDrafter.connect('stdout', aiStoryboarder.getAnchor('stdin'));
  manualStoryboarder.connect('stdout', pageGenerator.getAnchor('stdin'));

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


async function runAi(promptTemplate: string, params: { [key: string]: any }): Promise<string> {
  return callAi(apiKey, aiModel, replaceKeywords(promptTemplate, params));
}

function replaceKeywords(input: string, replacements: { [key: string]: string }): string {
  return input.replace(/\$\{(\w+)\}/g, (_, keyword) => {
      return replacements[keyword] || _;
  });

}  

let apiKey = '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';
let aiModel = 'gpt-4';

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

