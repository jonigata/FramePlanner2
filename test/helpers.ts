import type { Canvas } from 'canvas';
import { createCanvas, loadImage } from 'canvas';
import type { MediaConverter } from '../src/lib/filesystem/mediaConverter';
import type { MediaResource, RemoteMediaReference } from '../src/lib/filesystem/fileSystem';

export class NodeCanvasMediaConverter implements MediaConverter {
  async toStorable(
    media: MediaResource
  ): Promise<{ blob?: Blob; remote?: RemoteMediaReference; content?: string; mediaType?: string }> {
    // node-canvasのCanvasの場合
    if (this.isNodeCanvas(media)) {
      const buffer: Buffer = (media as Canvas).toBuffer('image/png');
      return { blob: new Blob([buffer]), mediaType: 'image' };
    }
    throw new Error('Unsupported media type for NodeCanvasMediaConverter');
  }

  async fromStorable(record: {
    blob?: Blob;
    remote?: RemoteMediaReference;
    content?: string;
    mediaType?: string;
  }): Promise<MediaResource> {
    if (record.blob && record.mediaType === 'image') {
      console.log('NodeCanvasMediaConverter.fromStorable record.blob:', record.blob, typeof record.blob, Object.prototype.toString.call(record.blob), record.blob?.constructor?.name);
      let bufferToLoad: Buffer;

      if (record.blob instanceof Blob) {
        if (typeof record.blob.arrayBuffer === 'function') {
          const arrayBuffer = await record.blob.arrayBuffer();
          bufferToLoad = Buffer.from(arrayBuffer);
        } else if (typeof (record.blob as any).stream === 'function') { // Node.js Blob might have stream()
          const stream = (record.blob as any).stream() as NodeJS.ReadableStream;
          const chunks: Buffer[] = [];
          for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          bufferToLoad = Buffer.concat(chunks);
        } else {
          console.error('record.blob is a Blob but lacks arrayBuffer and stream methods:', record.blob);
          throw new Error(`record.blob (type: ${record.blob?.constructor?.name}) is not a convertible Blob in NodeCanvasMediaConverter.fromStorable.`);
        }
      } else if (Buffer.isBuffer(record.blob)) {
        bufferToLoad = record.blob;
      } else if (record.blob && typeof record.blob === 'object' && record.blob !== null && 'byteLength' in record.blob && typeof (record.blob as any).slice === 'function') { // Check for Uint8Array-like properties first
        // If it looks like a Uint8Array, assume it's not a standard Blob we want to call arrayBuffer() on directly
        bufferToLoad = Buffer.from(record.blob as Uint8Array);
      } else {
        const blobType = record.blob ? Object.prototype.toString.call(record.blob) : String(record.blob);
        let constructorName = 'N/A';
        if (record.blob && typeof record.blob === 'object' && record.blob !== null && 'constructor' in record.blob && typeof (record.blob as any).constructor === 'function') {
            constructorName = (record.blob as any).constructor.name;
        }
        console.error('record.blob is not a Blob or Buffer or Uint8Array-like:', record.blob);
        throw new Error(`record.blob (type: ${constructorName}, toString: ${blobType}) is not a valid Blob, Buffer, or Uint8Array-like in NodeCanvasMediaConverter.fromStorable.`);
      }

      const img = await loadImage(bufferToLoad);
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      // node-canvasのCanvasを MediaResource として返す（テスト用途限定）
      return canvas as unknown as MediaResource;
    }
    throw new Error('Unsupported storable for NodeCanvasMediaConverter');
  }

  private isNodeCanvas(obj: unknown): obj is Canvas {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      typeof (obj as Canvas).toBuffer === 'function' &&
      typeof (obj as Canvas).getContext === 'function'
    );
  }
}

