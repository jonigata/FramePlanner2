import { type Writable, writable } from "svelte/store";

export type BookArchiveOperation = 'download' | 'copy' | 'export-psd' | 'aipictors';

export const bookArchiver: Writable<BookArchiveOperation[]> = writable([]);
