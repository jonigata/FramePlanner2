import { z } from "zod";
import { LayoutPage, LayoutColumn, LayoutRow } from "./layout";

const Format = z.enum(["4koma", "standard"])
  .describe("基本フォーマット。作風から適切な方を選べ");

const Character = z.object({
  name: z.string().describe("キャラクター名"),
  appearance: z.string().describe("キャラクターの容姿。脇役のappearanceは簡潔にすること"),
  themeColor: z.string().describe("キャラクターのテーマカラー"),
}).describe("キャラクター一覧。キャラクタードキュメントにない脇役も列挙しろ");

const Bubble = z.object({
  owner: z.string(),
  speech: z.string().describe("セリフは10文字前後までとしろ。また、適切に改行コード(\\n)を入れ、1行5文字程度に収めろ"),
  color: z.string().describe("セリフの色。話者のテーマカラー"),
  shape: z.enum(["rounded", "square", "ellipse", "polygon", "shout", "soft", "none"])
    .describe("セリフの形")
    .default("ellipse"),
}).describe("キャラクターのセリフ");

const Panel = z.object({
  composition: z.string()
    .describe("そのコマの視覚情報。画像生成AIに渡されるプロンプト。セリフや音声情報を含めるな。キャラクターはいなくてもよい。キャラクターのリアクションはオーバーにし、コマごとに大きく変化させろ。"),
  camera: z.enum([
    'from side', 'from back', 'Dutch angle shot', 'dramatic angle',
    'top-down view', 'aerial shot', 'birds-eye-view shot', 'top angle view',
    'from above', 'wide angle', 'eye-level shot', 'front view',
    'straight-on', 'from below'
  ]).describe("そのコマのカメラ。"),
  bubbles: z.array(Bubble).describe("そのコマのセリフ。セリフがない場合は空配列にしろ"),
  weight: z.number().describe("そのコマの重要度。0～1の範囲で指定しろ。0が最も不要で、1が最も重要"),
});

const Page = z.object({
  panels: z.array(Panel),
  layout: LayoutPage
    .describe("コマの配置")
    .nullable()
    .default(null),
});

export const Storyboard = z.object({
  format: Format,
  characters: z.array(Character),
  pages: z.array(Page),
});

export type Format = z.infer<typeof Format>;
export type Character = z.infer<typeof Character>;
export type Bubble = z.infer<typeof Bubble>;
export type Panel = z.infer<typeof Panel>;
export type Page = z.infer<typeof Page>;
export type Storyboard = z.infer<typeof Storyboard>;

export {
  LayoutPage,
  LayoutRow,
  LayoutColumn,
};
