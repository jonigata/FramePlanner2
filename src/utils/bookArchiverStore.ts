import { type Writable, writable } from "svelte/store";

export type BookArchiveOperation = 'download' | 'copy' | 'export-psd' | 'aipictors' | 'envelope' | 'export-prompts';

export const bookArchiver: Writable<BookArchiveOperation[]> = writable([]);
