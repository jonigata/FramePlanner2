import { type Writable, writable } from "svelte/store";
import type { CharacterLocal } from '../lib/book/book';

export const rosterOpen: Writable<boolean> = writable(false);
export const rosterSelectedCharacter: Writable<CharacterLocal | null>  = writable(null);
