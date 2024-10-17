export type ImageId = string & {_ImageId: never}; // SHA1

export interface ImageStorage {
  readCanvas(id: ImageId): Promise<HTMLCanvasElement>;
  writeCanvas(canvas: HTMLCanvasElement): Promise<ImageId>;
};

export abstract class ImageStorageBase implements ImageStorage {
  abstract readCanvas(id: ImageId): Promise<HTMLCanvasElement>;
  abstract writeCanvas(canvas: HTMLCanvasElement): Promise<ImageId>;
}
