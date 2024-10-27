import { type Writable, writable } from "svelte/store";
import type { Page } from '../../lib/book/book';

export const pageInspectorTarget: Writable<Page | null> = writable(null);
