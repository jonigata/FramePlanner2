import { z } from "zod";
import { LayoutPage } from "./layout"; // @deno-ts

// Format enum
const Format = z.enum(["4koma", "standard"]).describe("基本フォーマット。作風から適切な方を選べ");

// Character definition
const Character = z.object({
  name: z.string().describe("キャラクター名"),
  appearance: z.string().describe("キャラクターの容姿。脇役のappearanceは簡潔にすること"),
  themeColor: z.string().describe("キャラクターのテーマカラー"),
}).describe("キャラクター一覧。キャラクタードキュメントにない脇役も列挙しろ");

// Speech bubble definition
const SpeechBubble = z.object({
  owner: z.string(),
  speech: z.string().describe("セリフは10文字前後までとしろ。また、適切に改行コード(\\n)を入れ、1行5文字程度に収めろ"),
  color: z.string().describe("セリフの色。キャラクターのテーマカラー"),
  shape: z.enum(["ellipse", "square", "polygon", "shout", "soft", "none"]).describe("セリフの形。squareはナレーション以外に使わない。softが標準。オノマトペ・擬音などはnone"),
}).describe("キャラクターのセリフ");

// Panel definition
const Panel = z.object({
  composition: z.string().describe("そのコマの視覚情報。画像生成AIに渡されるプロンプト。セリフや音声情報を含めるな。キャラクターはいなくてもよい。キャラクターのリアクションはオーバーにし、コマごとに大きく変化させろ。"),
  camera: z.string().describe("そのコマのカメラ。以下のリストから選べ。'from side','from back','Dutch angle shot','dramatic angle','top-down view','aerial shot','birds-eye-view shot','top angle view','from above','wide angle','eye-level shot','front view','straight-on','from below'"),
  bubbles: z.array(SpeechBubble).describe("そのコマのセリフ。セリフがない場合は空配列にしろ"),
  weight: z.number().describe("そのコマの重要度。0～1の範囲で指定しろ。0が最も不要で、1が最も重要"),
});

// Page definition
const Page = z.object({
  panels: z.array(Panel),
  layout: LayoutPage.nullable().describe("ページのレイアウト"),
});

// Main MangaName structure
const Storyboard = z.object({
  format: Format,
  characters: z.array(Character),
  pages: z.array(Page),
});

// Type aliases for easier usage
type Format = z.infer<typeof Format>;
type Character = z.infer<typeof Character>;
type SpeechBubble = z.infer<typeof SpeechBubble>;
type Panel = z.infer<typeof Panel>;
type Page = z.infer<typeof Page>;
type Storyboard = z.infer<typeof Storyboard>;

export {
  Format,
  Character,
  SpeechBubble,
  Panel,
  Page,
  Storyboard,
};
