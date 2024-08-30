import { type Writable, writable } from "svelte/store";
import type { Page } from "../bookeditor/book";

export const batchImagingPage: Writable<Page> = writable(null);
