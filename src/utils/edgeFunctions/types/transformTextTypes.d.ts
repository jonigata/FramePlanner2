// @ts-nocheck: Suppress type checking for this file due to complex type definitions
import { z } from "zod";

export const TransformTextRequestSchema = z.object({
  method: z.string(),
  text: z.string(),
});
export type TransformTextRequest = z.infer<typeof TransformTextRequestSchema>;

export const TransformTextResponseSchema = z.object({
  text: z.string().describe("transformed text"),
});
export type TransformTextResponse = z.infer<typeof TransformTextResponseSchema>;
