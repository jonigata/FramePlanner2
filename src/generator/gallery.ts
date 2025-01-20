import type { Media } from "../lib/layeredCanvas/dataModels/media";

export type GalleryItem = Media | (() => Promise<Media[]>);
