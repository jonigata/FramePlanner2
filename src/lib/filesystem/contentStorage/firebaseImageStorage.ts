import { ref as sref, uploadBytes, type FirebaseStorage, getBlob, getMetadata, deleteObject } from "firebase/storage";
import { createCanvasFromBlob } from '../../layeredCanvas/tools/imageUtil';
import { sha1, blobToSha1 } from '../../layeredCanvas/tools/misc';
import { ContentStorageBase, type ContentId } from './contentStorage';

export class FirebaseContentStorage extends ContentStorageBase {
  private readonly storage: FirebaseStorage;

  constructor(storage: FirebaseStorage) {
    super();
    this.storage = storage;
  }

  async readBlob(id: ContentId): Promise<Blob> {
    console.log("*********** FirebaseImageStorage.readBlob");
    const storageFileRef = sref(this.storage, id);
    return await getBlob(storageFileRef);
  }

  async writeBlob(blob: Blob): Promise<ContentId> {
    console.log("*********** FirebaseImageStorage.writeBlob");
    const id = await blobToSha1(blob);
    const storageFileRef = sref(this.storage, id);

    try {
      // Try to get the metadata of the file
      await getMetadata(storageFileRef);
      console.log('File already exists, skipping...');
    } catch (error) {
      // If error occurs (e.g., file doesn't exist), upload the file
      const metadata = {
          contentType: blob.type,
      };
      await uploadBytes(storageFileRef, blob, metadata);
    }
    return id as ContentId;
  }

  async readCanvas(id: ContentId): Promise<HTMLCanvasElement> {
    console.log("*********** FirebaseImageStorage.readCanvas");
    const storageFileRef = sref(this.storage, id);
    const blob = await getBlob(storageFileRef);
    return createCanvasFromBlob(blob);
  }

  async writeCanvas(canvas: HTMLCanvasElement): Promise<ContentId> {
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
    return id as ContentId;
  }

  async erase(id: ContentId): Promise<void> {
    console.log("*********** FirebaseImageStorage.erase");
    const storageFileRef = sref(this.storage, id);
    await deleteObject(storageFileRef);
  }
}
