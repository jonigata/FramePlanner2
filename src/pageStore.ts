import { writable } from "svelte/store";

export type Page = {
  revision: number;
  frameTree: any,
  bubbles: any,
}

export const mainPage = writable(null);
