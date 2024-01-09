import { type Writable, writable } from "svelte/store";

export const bookArchiver: Writable<string[]> = writable([]);
