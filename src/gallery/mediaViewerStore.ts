import { type Writable, writable } from "svelte/store";
import type { Media } from "../lib/layeredCanvas/dataModels/media";

export const mediaViewerTarget: Writable<Media | null> = writable(null);
