import * as t from "io-ts";

export const Character = t.type({
  name: t.string,
  appearance: t.string,
  personality: t.string,
});

export const Notebook = t.type({
  theme: t.string,
  characters: t.array(Character),
  plot: t.string,
  scenario: t.string,
});

export type Character = t.TypeOf<typeof Character>;
export type Notebook = t.TypeOf<typeof Notebook>;
