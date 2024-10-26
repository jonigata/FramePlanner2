export type ContentId = string & {_ImageId: never}; // SHA1

export interface ContentStorage {
  readBlob(id: ContentId): Promise<Blob>;
  writeBlob(blob: Blob): Promise<ContentId>;
  readCanvas(id: ContentId): Promise<HTMLCanvasElement>;
  writeCanvas(canvas: HTMLCanvasElement): Promise<ContentId>;
  erase(id: ContentId): Promise<void>;
};

export abstract class ContentStorageBase implements ContentStorage {
  abstract readBlob(id: ContentId): Promise<Blob>;
  abstract writeBlob(blob: Blob): Promise<ContentId>;
  abstract readCanvas(id: ContentId): Promise<HTMLCanvasElement>;
  abstract writeCanvas(canvas: HTMLCanvasElement): Promise<ContentId>;
  abstract erase(id: ContentId): Promise<void>;
}
