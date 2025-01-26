import type { Media } from "../lib/layeredCanvas/dataModels/media.js";

export type GalleryItem = Media | (() => Promise<Media[]>);
