import type { Vector } from "../tools/geometry/geometry";

export type MediaType = 'image' | 'video';
export type RemoteMediaReference = { mediaType: MediaType, mode: string, requestId: string };
export type MaterializedType = HTMLCanvasElement | HTMLVideoElement;
export type MediaResource = MaterializedType | RemoteMediaReference;

export interface Media {
  readonly player: Player | null;
  readonly drawSource: MaterializedType;
  readonly drawSourceCanvas: HTMLCanvasElement;
  readonly persistentSource: MediaResource; 
  readonly naturalWidth: number;
  readonly naturalHeight: number;
  readonly type: MediaType;
  readonly size: Vector;
  readonly fileId: { [key: string]: string };
  readonly isLoaded: boolean;
  setMedia(media: MaterializedType): void;
}

export interface Player {
  play(): void;
  pause(): void;
  seek(time: number): Promise<void>;
}

export abstract class MediaBase implements Media {
  fileId: { [key: string]: string }; // filesystemId => fileId
  protected _isLoaded: boolean = false;
  private static loadingCanvas: HTMLCanvasElement;
  static { 
    MediaBase.loadingCanvas = MediaBase.createLoadingCanvas(512, 512); 
  }

  constructor() {
    this.fileId = {};
  }

  get size(): Vector {
    return [this.naturalWidth, this.naturalHeight];
  }

  abstract get player(): Player | null;
  abstract get drawSource(): MaterializedType;
  abstract get drawSourceCanvas(): HTMLCanvasElement;
  abstract get persistentSource(): MediaResource;
  abstract get naturalWidth(): number;
  abstract get naturalHeight(): number;
  abstract get type(): MediaType;

  get isLoaded(): boolean {
    return this._isLoaded;
  }

  abstract setMedia(media: MaterializedType): void;

  setLoaded(isLoaded: boolean): void {
    this._isLoaded = isLoaded;
  }

  getFileId(fileSystemId: string): string {
    return this.fileId[fileSystemId];
  }

  setFileId(fileSystemId: string, fileId: string): void {
    this.fileId[fileSystemId] = fileId;
  }

  static createLoadingCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    // グレーの背景
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    // "Loading..."テキスト
    ctx.fillStyle = '#666666';
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Loading...', width / 2, height / 2);
    
    return canvas;
  }

  protected getLoadingCanvas(): HTMLCanvasElement {
    return MediaBase.loadingCanvas;
  }

}

export class ImageMedia extends MediaBase {
  private canvas: HTMLCanvasElement | undefined;
  private remoteMediaReference: RemoteMediaReference | undefined;

  constructor(mediaResource: HTMLCanvasElement | RemoteMediaReference) {
    super();
    if (mediaResource instanceof HTMLCanvasElement) {
      this.setCanvas(mediaResource);
    } else {
      this.remoteMediaReference = mediaResource;
    }
  }

  setMedia(media: HTMLCanvasElement) {
    this.setCanvas(media);
  }

  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.remoteMediaReference = undefined;
    this.setLoaded(true);
  }

  get player(): Player | null { return null; }
  get drawSource(): HTMLCanvasElement { return this.canvas ?? this.getLoadingCanvas(); }
  get drawSourceCanvas(): HTMLCanvasElement { return this.drawSource; }
  get persistentSource(): MediaResource { 
    return this.remoteMediaReference ?? this.drawSource; 
  }
  get naturalWidth(): number { return this.drawSource.width; }
  get naturalHeight(): number { return this.drawSource.height; }
  get type(): MediaType { return 'image'; }
}

export class VideoMedia extends MediaBase {
  private video: HTMLVideoElement | undefined;
  private remoteMediaReference: RemoteMediaReference | undefined;

  constructor(mediaResource: HTMLVideoElement | RemoteMediaReference) {
    super();
    if (mediaResource instanceof HTMLVideoElement) {
      this.setVideo(mediaResource);
    } else {
      this.remoteMediaReference = mediaResource;
    }
  }

  setMedia(media: HTMLVideoElement) {
    this.setVideo(media);
  }

  setVideo(video: HTMLVideoElement) {
    this.video = video;
    this.remoteMediaReference = undefined
    this.setLoaded(true);
  }

  get player(): Player {
    return {
      play: () => this.video?.play(),
      pause: () => this.video?.pause(),
      seek: async (time: number) => { 
        const video = this.video;
        if (!video) {
          throw new Error('Video element is not set');
        }
        return new Promise((resolve, reject) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };

          const onError = () => {
            video.removeEventListener('seeked', onSeeked);
            reject(new Error('Seek failed'));
          };

          video.addEventListener('seeked', onSeeked, { once: true });
          video.addEventListener('error', onError, { once: true });

          video.currentTime = time;
        });        this.video!.currentTime = time; 
      }
    };
  }
  get drawSource(): MaterializedType { return this.video ?? this.getLoadingCanvas(); }
  get drawSourceCanvas(): HTMLCanvasElement { 
    if (!this.video) { return this.getLoadingCanvas(); }
    const canvas = document.createElement('canvas');
    canvas.width = this.naturalWidth;
    canvas.height = this.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(this.video!, 0, 0);
    return canvas;
  }
  get persistentSource(): MediaResource { return this.remoteMediaReference ?? this.video!; }
  get naturalWidth(): number { return this.video ? this.video.videoWidth : this.getLoadingCanvas().width; }
  get naturalHeight(): number { return this.video ? this.video.videoHeight : this.getLoadingCanvas().height; }
  get type(): MediaType { return 'video'; }
}

export function buildMedia(mediaResource: MediaResource): Media {
  if (mediaResource instanceof HTMLCanvasElement) {
    return new ImageMedia(mediaResource);
  } else if (mediaResource instanceof HTMLVideoElement) {
    return new VideoMedia(mediaResource);
  } else if (mediaResource.mediaType === 'image') {
    return new ImageMedia(mediaResource);
  } else {
    return new VideoMedia(mediaResource);
  }
}

export function buildNullableMedia(mediaResource: MediaResource | null): Media | null {
  if (mediaResource === null) {
    return null;
  }
  return buildMedia(mediaResource);
}

export function mediaResourceSize(mediaResource: MediaResource): Vector | null {
  if (mediaResource instanceof HTMLCanvasElement) {
    return [mediaResource.width, mediaResource.height];
  } else if (mediaResource instanceof HTMLVideoElement) {
    return [mediaResource.videoWidth, mediaResource.videoHeight];
  } else {
    return null;
  }
}