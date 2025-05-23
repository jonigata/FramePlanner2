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
      const blob = new Blob([buffer], { type: 'image/png' });
      await blob.arrayBuffer(); // BlobのarrayBufferメソッドを呼び出して、Blobを確実に読み込む
      return { blob };
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
      // toStorableで作成されたBlobであることを前提とする
      // Node.jsのBlobはarrayBuffer()メソッドを持つ
      if (!(record.blob instanceof Blob) || typeof record.blob.arrayBuffer !== 'function') {
        throw new Error(
          `record.blob is not a valid Blob created by toStorable. Expected Blob with arrayBuffer method, got ${
            record.blob?.constructor?.name
          }`
        );
      }

      const arrayBuffer = await record.blob.arrayBuffer();
      const bufferToLoad = Buffer.from(arrayBuffer);

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

