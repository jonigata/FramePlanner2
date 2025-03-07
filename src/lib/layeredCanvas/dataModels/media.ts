import type { Vector } from "../tools/geometry/geometry";

export type MediaType = 'image' | 'video';

export interface Media {
  seek(time: number): Promise<void>;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
  readonly drawSource: HTMLCanvasElement | HTMLVideoElement;
  readonly type: MediaType;
  readonly size: Vector;
  readonly fileId: { [key: string]: string };
}

export abstract class MediaBase implements Media {
  fileId: { [key: string]: string }; // filesystemId => fileId

  constructor() {
    this.fileId = {};
  }

  async seek(time: number): Promise<void> {}

  get size(): Vector {
    return [this.naturalWidth, this.naturalHeight];
  }

  abstract get naturalWidth(): number;
  abstract get naturalHeight(): number;
  abstract get drawSource(): HTMLCanvasElement | HTMLVideoElement;
  abstract get type(): MediaType;

  getFileId(fileSystemId: string): string {
    return this.fileId[fileSystemId];
  }

  setFileId(fileSystemId: string, fileId: string): void {
    this.fileId[fileSystemId] = fileId;
  }
}

// ImageMedia クラスは MediaBase を継承して、Media インターフェースに基づく型を持つ
export class ImageMedia extends MediaBase {
  constructor(public canvas: HTMLCanvasElement) {
    super();
  }

  // 抽象プロパティの具体的な実装
  get naturalWidth(): number { return this.canvas.width; }
  get naturalHeight(): number { return this.canvas.height; }
  get drawSource(): HTMLCanvasElement { return this.canvas; }
  get type(): MediaType { return 'image'; }
}

export class VideoMedia extends MediaBase {
  video: HTMLVideoElement;
  constructor(video: HTMLVideoElement) {
    super();
    this.video = video;
  }

  async seek(timeInSeconds: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const video = this.video;
      let start = performance.now();
      video.onerror = () => {
        reject(new Error('Error during the video loading or processing.'));
      };
  
      video.onseeked = () => {
        console.log('seeked', performance.now() - start);
        resolve();
      };
  
      if (video.readyState >= 1) {
        console.log(`seek from ${video.currentTime} to ${timeInSeconds}`);
        video.currentTime = timeInSeconds;
      } else {
        video.onloadedmetadata = () => {
          video.currentTime = timeInSeconds;
        };
      }
    });
  }

  get naturalWidth(): number { return this.video.videoWidth; }
  get naturalHeight(): number { return this.video.videoHeight; }
  get drawSource(): HTMLVideoElement { return this.video; }
  get type(): MediaType { return 'video'; }
}

