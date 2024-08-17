import * as t from "io-ts";
import { ignore } from "typai";
import { Storyboard } from "./storyboard";

export const Character = t.type({
  ulid: ignore(t.string),
  name: t.string,
  personality: t.string,
  appearance: t.string,
  themeColor: t.string,
  portrait: ignore(t.any), // 'loading' | HTMLImageElement
});

export const Notebook = t.type({
  theme: t.string,
  characters: t.array(Character),
  plot: t.string,
  scenario: t.string,
  storyboard: Storyboard,
  critique: t.string,
});

export type Character = t.TypeOf<typeof Character>;
export type Notebook = t.TypeOf<typeof Notebook>;

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
