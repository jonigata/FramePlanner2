import { type Writable, writable } from "svelte/store";

export type EffectChoiceNotifier = (tag: string) => void;

export const effectChoiceNotifier: Writable<EffectChoiceNotifier> = writable(null);
