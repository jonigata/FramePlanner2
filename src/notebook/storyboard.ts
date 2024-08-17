import * as t from "io-ts";
import {annotate} from "typai";

// Format enum
const Format = annotate(t.string, {
  description: "基本フォーマット。作風から適切な方を選べ",
  enum: ["4koma", "standard"],
});

// Character definition
const Character = annotate(
  t.type({
    name: annotate(t.string, {description: "キャラクター名"}),
    appearance: annotate(t.string, {description: "キャラクターの容姿。脇役のappearanceは簡潔にすること"}),
    themeColor: annotate(t.string, {description: "キャラクターのテーマカラー"}),
  }),
  {description: "キャラクター一覧。キャラクタードキュメントにない脇役も列挙しろ"},
);

// Speech bubble definition
const Bubble = annotate(
  t.type({
    owner: t.string,
    speech: annotate(t.string, {description: "セリフは10文字前後までとしろ。また、適切に改行コード(\\n)を入れ、1行5文字程度に収めろ"}),
    color: annotate(t.string, {description: "セリフの色。話者のテーマカラー"}),
  }),
  {description: "キャラクターのセリフ"},
);

// Panel definition
const Panel = t.type({
  composition: annotate(t.string, {description: "そのコマの視覚情報。画像生成AIに渡されるプロンプト。セリフや音声情報を含めるな。キャラクターはいなくてもよい。キャラクターのリアクションはオーバーにし、コマごとに大きく変化させろ。"}),
  camera: annotate(t.string, {description: "そのコマのカメラ。以下のリストから選べ。'from side','from back','Dutch angle shot','dramatic angle','top-down view','aerial shot','birds-eye-view shot','top angle view','from above','wide angle','eye-level shot','front view','straight-on','from below'"}),
  bubbles: annotate(t.array(Bubble), {description: "そのコマのセリフ。セリフがない場合は空配列にしろ"}),
});

// Page definition
const Page = t.type({
  panels: t.array(Panel),
});

// Main MangaName structure
const Storyboard = t.type({
  format: Format,
  characters: t.array(Character),
  pages: t.array(Page),
});

// Type aliases for easier usage
type Format = t.TypeOf<typeof Format>;
type Character = t.TypeOf<typeof Character>;
type Bubble = t.TypeOf<typeof Bubble>;
type Panel = t.TypeOf<typeof Panel>;
type Page = t.TypeOf<typeof Page>;
type Storyboard = t.TypeOf<typeof Storyboard>;

export {
  Format,
  Character,
  Bubble,
  Panel,
  Page,
  Storyboard,
};
