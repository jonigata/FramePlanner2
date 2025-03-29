// @ts-nocheck: Suppress type checking for this file due to complex type definitions
import { NotebookBaseSchema } from "$bookTypes/notebook"; // @deno-ts
import { z } from "zod";

export const ThinkerSchema = z.enum(["sonnet", "sonnet:think", "gpt4o", "o1", "gemini"]);
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

