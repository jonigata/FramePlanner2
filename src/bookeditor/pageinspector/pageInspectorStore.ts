import { type Writable, writable } from "svelte/store";
import type { Page } from '../book';

export const pageInspectorTarget: Writable<Page | null> = writable(null);
