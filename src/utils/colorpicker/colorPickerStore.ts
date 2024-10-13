import { type Writable, writable } from "svelte/store"

export type ColorPickerCall = {
  position: {x: number, y: number};
  color: string;
  onUpdate: (color: string) => void;
}

export const colorPickerStore: Writable<ColorPickerCall | null> = writable(null);
