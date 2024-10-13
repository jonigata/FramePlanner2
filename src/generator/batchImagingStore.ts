import { type Writable, writable, get } from "svelte/store";
import type { Page } from "../bookeditor/book";

export const batchImagingPage: Writable<Page | null> = writable(null);
export const busy: Writable<boolean> = writable(false);

export async function execute(child: any) {
  console.log('execute');
  busy.set(true);
  await child.excecute(get(batchImagingPage));
  busy.set(false);
  console.log('execute done');
}
