import { z } from "zod";
import { StoryboardSchema } from "./storyboard"; // @deno-ts

export const CharacterBaseSchema = z.object({
  name: z.string(),
  personality: z.string(),
  appearance: z.string(),
  themeColor: z.string(),
  ulid: z.string(),
});
export type CharacterBase = z.infer<typeof CharacterBaseSchema>;

export const CharactersBaseSchema = z.array(CharacterBaseSchema);
export type CharactersBase = z.infer<typeof CharactersBaseSchema>;

export const NotebookBaseSchema = z.object({
  theme: z.string(),
  characters: z.array(CharacterBaseSchema),
  plot: z.string(),
  scenario: z.string(),
  storyboard: StoryboardSchema.nullable(),
  critique: z.string(),
  pageNumber: z.number().nullable(),
  format: z.enum(["4koma", "standard"]),
});
export type NotebookBase = z.infer<typeof NotebookBaseSchema>;

