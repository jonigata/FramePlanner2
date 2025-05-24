import type { MediaResource, RemoteMediaReference } from './fileSystem';
import { createCanvasFromBlob, createCanvasFromImage, createVideoFromBlob, canvasToBlob } from '../layeredCanvas/tools/imageUtil';

// Node.js specific code removed

export async function dataURLtoBlob(dataURL: string): Promise<Blob> {
  const res = await fetch(dataURL);
  const blob = await res.blob();
  return blob;
}

export async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * MediaResource <-> IndexedDB保存用レコード 変換インターフェース
 */
export interface MediaConverter {
  toStorable(media: MediaResource): Promise<{
    blob?: Blob;
    remote?: RemoteMediaReference;
    content?: string;
    mediaType?: string;
  }>;
  fromStorable(record: {
    blob?: Blob;
    remote?: RemoteMediaReference;
    content?: string;
    mediaType?: string;
  }): Promise<MediaResource>;
  blobToDataURL(blob: Blob): Promise<string>;
  dataURLtoBlob(dataURL: string): Promise<Blob>;
}

export class BrowserMediaConverter implements MediaConverter {
  async toStorable(media: MediaResource): Promise<{
    blob?: Blob;
    remote?: RemoteMediaReference;
    content?: string;
    mediaType?: string;
  }> {
    if (media instanceof HTMLCanvasElement) {
      const blob = await canvasToBlob(media);
      return { blob, mediaType: 'image' };
    } else if (media instanceof HTMLVideoElement) {
      const blob = await fetch(media.src).then(res => res.blob());
      return { blob, mediaType: 'video' };
    } else if (typeof media === 'object' && media !== null && 'url' in media) {
      return { remote: media as RemoteMediaReference };
    } else {
      // fallback: dataURL
      if (media instanceof Image) {
        return { content: media.src, mediaType: 'image' };
      }
      throw new Error('Unknown media type for toStorable');
    }
  }

  async fromStorable(record: {
    blob?: Blob;
    remote?: RemoteMediaReference;
    content?: string;
    mediaType?: string;
  }): Promise<MediaResource> {
    if (record.remote) {
      return record.remote;
    }
    if (record.blob) {
      if (record.mediaType === 'image' || record.mediaType === undefined) {
        return await createCanvasFromBlob(record.blob);
      }
      if (record.mediaType === 'video') {
        return await createVideoFromBlob(record.blob);
      }
      throw new Error('Unknown mediaType for blob');
    }
    if (record.content) {
      const image = new Image();
      image.src = record.content;
      await image.decode();
      return await createCanvasFromImage(image);
    }
    throw new Error('Broken media data');
  }

  async blobToDataURL(blob: Blob): Promise<string> {
    return blobToDataURL(blob);
  }

  async dataURLtoBlob(dataURL: string): Promise<Blob> {
    return dataURLtoBlob(dataURL);
  }
}