// @ts-nocheck: Suppress type checking for this file due to complex type definitions
import { NotebookBaseSchema } from "$bookTypes/notebook"; // @deno-ts
import { z } from "zod";

export const ThinkerSchema = z.enum([
  "sonnet", 
  "sonnet:think", 
  "sonnet-4.0",
  "opus-4.6",
  "gpt4o", 
  "gpt-5.6-luna",
  "gpt-5.6-luna-pro",
  "gpt-5.6-sol",
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-chat",
  "o4-mini", 
  "o4-mini-high", 
  "o3", 
  "gemini", 
  "gemini-flash", 
  "gemini-flash-lite", 
  "gemini-flash:think", 
  "grok3-mini", 
  "grok3",
  "grok4",
  // 以下は旧クライアント互換。ブラウザにキャッシュされた古いフロントがこれらを送ってくるため、
  // 弾かずに受け付ける。実際に使うモデルは advise.ts の modelTable で読み替えている。
  // 移行が済んだら消してよい。UIの選択肢(ThinkerSelector)には出さないこと。
  "opus-4.1",
  "gpt4.1",
  "gpt4.1-mini",
  "gpt4.1-nano",
]);
export type Thinker = z.infer<typeof ThinkerSchema>;

export const NotebookRequestSchema = z.object({
  thinker: ThinkerSchema,
  notebook: NotebookBaseSchema,
});
export type NotebookRequest = z.infer<typeof NotebookRequestSchema>;

export const NotebookWithInstructionRequestSchema = NotebookRequestSchema.extend({
  instruction: z.string()
});
export type NotebookWithInstructionRequest = z.infer<typeof NotebookWithInstructionRequestSchema>;

export const AdviseThemeRequestSchema = NotebookRequestSchema.extend({
  recentThemes: z.array(z.string()).optional().describe("直近に生成したテーマ。発想の重複を避けるために使う"),
});
export type AdviseThemeRequest = z.infer<typeof AdviseThemeRequestSchema>;

export const AdviseThemeResponseSchema = z.object({
  theme: z.string(),
  pageNumber: z.number(),
  format: z.enum(["4koma", "standard"])
});
export type AdviseThemeResponse = z.infer<typeof AdviseThemeResponseSchema>;


export const AdvisePageGenerationResponseSchema = z.object({
  pages: z.array(z.string()).describe("各ページの画像生成用マークダウンプロンプト"),
});
export type AdvisePageGenerationResponse = z.infer<typeof AdvisePageGenerationResponseSchema>;
