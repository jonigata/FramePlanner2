import { type Writable, writable } from "svelte/store";
import type { Character } from '../lib/book/notebook';

export const rosterOpen: Writable<boolean> = writable(false);
export const rosterSelectedCharacter: Writable<Character | null>  = writable(null);
