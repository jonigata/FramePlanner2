import { z } from "zod";

export const LayoutColumn = z.object({
  id: z.string().describe("対応する入力要素のid"),
  ratio: z.number().describe("兄弟間でのratio(weightに比例する)"),
}).describe("横方向要素、1～2要素 すべてのコマの重要度が低い場合は3要素も許される");
export type LayoutColumn = z.infer<typeof LayoutColumn>;

export const LayoutRow = z.object({
  columns: z.array(LayoutColumn),
  ratio: z.number().describe("兄弟間でのratio(weightに比例する)"),
}).describe("縦方向要素(段)、1～3要素");
export type LayoutRow = z.infer<typeof LayoutRow>;

export const LayoutPage = z.object({
  rows: z.array(LayoutRow),
}).describe("ページ");
export type LayoutPage = z.infer<typeof LayoutPage>;
