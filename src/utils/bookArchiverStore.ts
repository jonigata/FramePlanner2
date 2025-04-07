import { type Writable, writable } from "svelte/store";

export type BookArchiveOperation =
  'download' |
  'download-after-upscale' |
  'copy' |
  'copy-after-upscale' |
  'export-psd' |
  'aipictors' |
  'envelope' |
  'export-prompts' |
  'publish' |
  'download-publication-files' |
  'share-book';

export const bookArchiver: Writable<BookArchiveOperation[]> = writable([]);
