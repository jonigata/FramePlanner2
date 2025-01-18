import type { Vector } from "../tools/geometry/geometry";
import { EventEmitter } from 'events';

export type MediaType = 'image' | 'video';

export interface Media {
  readonly player: Player | null;
  readonly drawSource: HTMLCanvasElement | HTMLVideoElement;
  readonly drawSourceCanvas: HTMLCanvasElement;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
  readonly type: MediaType;
  readonly size: Vector;
  readonly fileId: { [key: string]: string };
  readonly isLoaded: boolean;
  subscribeLoadStatusChange(listener: (isLoaded: boolean) => void): () => void;
  setLoaded(isLoaded: boolean): void;
}

export interface Player {
  play(): void;
  pause(): void;
  seek(time: number): Promise<void>;
}

export abstract class MediaBase extends EventEmitter implements Media {
  fileId: { [key: string]: string }; // filesystemId => fileId
  protected _isLoaded: boolean = false;
  private static loadingCanvas: HTMLCanvasElement;
  static { 
    MediaBase.loadingCanvas = MediaBase.createLoadingCanvas(512, 512); 
  }

  constructor() {
    super();
    this.fileId = {};
  }

  get size(): Vector {
    return [this.naturalWidth, this.naturalHeight];
  }

  abstract get player(): Player | null;
  abstract get drawSource(): HTMLCanvasElement | HTMLVideoElement;
  abstract get drawSourceCanvas(): HTMLCanvasElement;
  abstract get naturalWidth(): number;
  abstract get naturalHeight(): number;
  abstract get type(): MediaType;

  get isLoaded(): boolean {
    return this._isLoaded;
  }

  subscribeLoadStatusChange(listener: (isLoaded: boolean) => void): () => void {
    this.on('loadStatusChange', listener);
    return () => {
      this.off('loadStatusChange', listener);
    };
  }

  setLoaded(isLoaded: boolean): void {
    if (this._isLoaded !== isLoaded) {
      this._isLoaded = isLoaded;
      this.emit('loadStatusChange', isLoaded);
    }
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
  constructor(canvas?: HTMLCanvasElement) {
    super();
    if (canvas) {
      this.setCanvas(canvas);
    }
  }

  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setLoaded(true);
  }

  get player(): Player | null { return null; }
  get drawSource(): HTMLCanvasElement { return this.canvas ?? this.getLoadingCanvas(); }
  get drawSourceCanvas(): HTMLCanvasElement { return this.drawSource; }
  get naturalWidth(): number { return this.drawSource.width; }
  get naturalHeight(): number { return this.drawSource.height; }
  get type(): MediaType { return 'image'; }
}

export class VideoMedia extends MediaBase {
  private video: HTMLVideoElement | undefined;
  constructor(video?: HTMLVideoElement) {
    super();
    if (video) {
      this.setVideo(video);
    }
  }

  setVideo(video: HTMLVideoElement) {
    this.video = video;
    this.setLoaded(true);
  }

  get player(): Player {
    return {
      play: () => this.video!.play(),
      pause: () => this.video!.pause(),
      seek: async (time: number) => { this.video!.currentTime = time; }
    };
  }
  get drawSource(): HTMLVideoElement | HTMLCanvasElement { return this.video ?? this.getLoadingCanvas(); }
  get drawSourceCanvas(): HTMLCanvasElement { 
    if (!this.video) { return this.getLoadingCanvas(); }
    const canvas = document.createElement('canvas');
    canvas.width = this.naturalWidth;
    canvas.height = this.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(this.video!, 0, 0);
    return canvas;
  }
  get naturalWidth(): number { return this.video ? this.video.videoWidth : this.getLoadingCanvas().width; }
  get naturalHeight(): number { return this.video ? this.video.videoHeight : this.getLoadingCanvas().height; }
  get type(): MediaType { return 'video'; }
}

