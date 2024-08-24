import * as t from "io-ts";
import {annotate} from "typai";

export const LayoutColumn = annotate(
  t.type({
    id: annotate(t.string, {description: "対応する入力要素のid"}),
    ratio: annotate(t.number, {description: "兄弟間でのratio(weightに比例する)"}),
  }),
  {description: "横方向要素、1～2要素 すべてのコマの重要度が低い場合は3要素も許される"}
);
export type LayoutColumn = t.TypeOf<typeof LayoutColumn>;

export const LayoutRow = annotate(
  t.type({
    columns: t.array(LayoutColumn),
    ratio: annotate(t.number, {description: "兄弟間でのratio(weightに比例する)"}),
  }),
  {description: "縦方向要素(段)、1～3要素"}
);
export type LayoutRow = t.TypeOf<typeof LayoutRow>;

export const LayoutPage = annotate(
  t.type({
    rows: t.array(LayoutRow),
  }),
  {description: "ページ"}
);
export type LayoutPage = t.TypeOf<typeof LayoutPage>;

