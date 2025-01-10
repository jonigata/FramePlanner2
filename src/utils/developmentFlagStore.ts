import { writable } from "svelte/store";

export const developmentFlag = writable(false);
export const saveProhibitFlag = writable(false);
