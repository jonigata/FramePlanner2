export type Character = { name: string, appearance: string };
export type Bubble = { owner: string, speech: string };
export type Panel = { composition: string, bubbles: Bubble[] };
export type Page = { panels: Panel[] };

export type Storyboard = {
  format: "4koma" | "standard";
  characters: Character[],
  pages: Page[]  
}
