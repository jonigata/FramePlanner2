export type Character = { name: string, appearance: string };
export type Bubble = { owner: string, speech: string };
export type Scene = { composition: string, bubbles: Bubble[] };
export type Page = { scenes: Scene[] };

export type Storyboard = {
  characters: Character[],
  pages: Page[]  
}
