import { type Writable, writable } from "svelte/store";

export type EffectChoiceNotifier = (tag: string | null) => void;

export const effectChoiceNotifier: Writable<EffectChoiceNotifier | null> = writable(null);
