import { z } from 'zod';
import { Storyboard } from './storyboard';

export const Character = z.object({
  name: z.string(),
  appearance: z.string().describe("キャラクターの容姿。簡潔な属性の羅列として1行で出力するように。脇役のappearanceは簡潔にすること。"),
  themeColor: z.string().describe("キャラクターのテーマカラー"),
  personality: z.string(),
});
export type Character = z.infer<typeof Character>;

export const Characters = z.array(Character);
export type Characters = z.infer<typeof Characters>;

export const Notebook = z.object({
  theme: z.string(),
  characters: Characters,
  plot: z.string(),
  scenario: z.string(),
  storyboard: z.union([Storyboard, z.null(), z.undefined()]),
});
export type Notebook = z.infer<typeof Notebook>;
