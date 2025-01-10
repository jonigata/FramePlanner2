import { z } from "zod";
import { Storyboard } from "./storyboard";

export const Character = z.object({
  ulid: z.string(),
  name: z.string(),
  personality: z.string(),
  appearance: z.string(),
  themeColor: z.string(),
  portrait: z.any().nullable(), // 'loading' | HTMLImageElement
});

export const Notebook = z.object({
  theme: z.string(),
  characters: z.array(Character),
  plot: z.string(),
  scenario: z.string(),
  storyboard: Storyboard.nullable(),
  critique: z.string(),
});

export type Character = z.infer<typeof Character>;
export type Notebook = z.infer<typeof Notebook>;

export const Characters = z.array(Character);
export type Characters = z.infer<typeof Characters>;

export function emptyNotebook(): Notebook {
  return {
    theme: "",
    characters: [],
    plot: "",
    scenario: "",
    storyboard: null,
    critique: "",
  };
}
