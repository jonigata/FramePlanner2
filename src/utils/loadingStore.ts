import { writable, type Writable } from "svelte/store";

export const loading = writable(false);
export const progress: Writable<number | null> = writable(null);
