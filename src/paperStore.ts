import { writable } from "svelte/store";
import type { an } from "vitest/dist/types-fe79687a";

export const paperTemplate = writable(null);
export const saveToken = writable(false);
export const clipboardToken = writable(false);
export const importingImage = writable(null);
