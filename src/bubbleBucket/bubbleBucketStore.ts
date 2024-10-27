import { writable, type Writable } from "svelte/store";
import type { Page } from "../lib/book/book";

export const bubbleBucketPage: Writable<Page | null> = writable(null);
export const bubbleBucketDirty = writable(false);
