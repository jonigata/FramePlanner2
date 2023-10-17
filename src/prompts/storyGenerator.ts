import OpenAI from 'openai';
import { parse as JSONCParse } from 'jsonc-parser';

export async function generateStory(apiKey: string, model: string, theme: string, pageNumber: number) {
  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });

  const prompt =`
# Task Description

マンガのアイディアを考えてください。
題材：${theme}
ページ数：${pageNumber}ページ
1ページあたり6～8コマ程度で構成してください。

考えた内容以外の情報は出力しないでください。
`
;

  console.log("generateStory PROMPT: ", prompt);
  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: model,
  });

  console.log("generateStory RESULT: ", chatCompletion.choices[0].message.content);
  return chatCompletion.choices[0].message.content;
}

export async function storyBoarding(apiKey: string, model: string, story: string, pageNumber: number) {
  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });

  const prompt =`
# Task Description

マンガのアイディアをフォーマットしてください。
題材とページ数は最後に伝えます。

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

# Task condition

ページ数：${pageNumber}ページ
元になるストーリー：${story}


元になるストーリーでは、1ページあたりのコマ数が多いですが、
冗長なコマを削る、一コマに複数のセリフを収めるなどして1ページあたり4～6コマ程度になるように構成してください。
`
;

  console.log("storyBoarding PROMPT: ", prompt);
  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
      model: model,
  });

  console.log("storyBoarding RESULT: ", chatCompletion.choices[0].message.content);
  return JSONCParse(chatCompletion.choices[0].message.content);
}

export async function generate_mock() {
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
