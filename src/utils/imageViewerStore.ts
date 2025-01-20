import { type Writable, writable } from "svelte/store";
import type { Media } from "../lib/layeredCanvas/dataModels/media";

export const imageViewerTarget: Writable<Media | null> = writable(null);
