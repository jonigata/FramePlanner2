import { ref as sref, uploadBytes, type FirebaseStorage, getBlob, getMetadata } from "firebase/storage";
import { createCanvasFromBlob } from '../../../utils/imageUtil';
import { sha1 } from '../../../lib/Misc';
import { ImageStorageBase, type ImageId } from './imageStorage';

export class FirebaseImageStorage extends ImageStorageBase {
  private readonly storage: FirebaseStorage;

  constructor(storage: FirebaseStorage) {
    super();
    this.storage = storage;
  }

  async readCanvas(id: ImageId): Promise<HTMLCanvasElement> {
    console.log("*********** FirebaseImageStorage.readCanvas");
    const storageFileRef = sref(this.storage, id);
    const blob = await getBlob(storageFileRef);
    return createCanvasFromBlob(blob);
  }

  async writeCanvas(canvas: HTMLCanvasElement): Promise<ImageId> {
    console.log("*********** FirebaseImageStorage.writeCanvas");
    const base64Image = canvas.toDataURL('image/png');
    const id = await sha1(base64Image);

    const storageFileRef = sref(this.storage, id);

    try {
      // Try to get the metadata of the file
      await getMetadata(storageFileRef);
      console.log('File already exists, skipping...');
    } catch (error) {
      // If error occurs (e.g., file doesn't exist), upload the file
      const data = base64Image.split(',')[1];
      const blob = new Blob(
          [Uint8Array.from(atob(data), c => c.charCodeAt(0))],
          { type: 'image/png' }
      );

      const metadata = {
          contentType: 'image/png',
      };
      await uploadBytes(storageFileRef, blob, metadata);
    }
    return id as ImageId;
  }
}
