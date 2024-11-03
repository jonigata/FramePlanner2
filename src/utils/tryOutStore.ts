import { type Writable, writable } from "svelte/store";

export const tryOutToken: Writable<boolean> = writable(false);
