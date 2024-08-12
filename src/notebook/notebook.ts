import * as t from "io-ts";
import { ignore } from "typai";

export const Character = t.type({
  name: t.string,
  personality: t.string,
  appearance: t.string,
  appearanceEn: t.string,
  portrait: ignore(t.any), // 'loading' | HTMLImageElement
});

export const Notebook = t.type({
  theme: t.string,
  characters: t.array(Character),
  plot: t.string,
  scenario: t.string,
});

export type Character = t.TypeOf<typeof Character>;
export type Notebook = t.TypeOf<typeof Notebook>;
