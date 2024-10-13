import type { Vector } from "../tools/geometry/geometry";

export interface Media {
  seek(time: number): Promise<void>;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
  readonly drawSource: HTMLCanvasElement | HTMLVideoElement;
  readonly size: Vector;
}

export abstract class Media implements Media {
  fileId: { [key: string]: string}; // filesystemId => fileId
  constructor() {
    this.fileId = {};
  }

  getFileId(fileSystemId: string): string {
    return this.fileId[fileSystemId];
  }
  setFileId(fileSystemId: string, fileId: string): void {
    this.fileId[fileSystemId] = fileId;
  }
}

export class ImageMedia extends Media {
  constructor(public canvas: HTMLCanvasElement) {
    super();
  }

  get naturalWidth(): number { return this.canvas.width; }
  get naturalHeight(): number { return this.canvas.height; }
  get drawSource(): HTMLCanvasElement { return this.canvas; }
}

export class VideoMedia extends Media {
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
  get drawSource(): HTMLVideoElement {
    return this.video; 
  }
}

