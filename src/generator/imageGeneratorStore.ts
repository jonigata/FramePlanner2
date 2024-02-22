import { type Writable, writable } from "svelte/store";
import type { FrameElement } from "../lib/layeredCanvas/dataModels/frameTree";

export const imageGeneratorTarget: Writable<FrameElement> = writable(null);
