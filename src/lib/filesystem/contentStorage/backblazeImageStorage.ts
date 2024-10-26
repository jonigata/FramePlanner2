import { createCanvasFromImage } from '../../../utils/imageUtil';
import { blobToSha1 } from '../../Misc';
import { ContentStorageBase, type ContentId } from './contentStorage';
import { getUploadUrl, getDownloadUrl, eraseFile } from '../../../firebase';

// 復号キーは公開しても問題ない（主に検閲させないためのものなので）
async function fetchImageWithHeaders(url: string) {
  const response = await fetch(url, {
      method: 'GET',
      headers: {
          "X-Bz-Server-Side-Encryption-Customer-Algorithm": "AES256",
          "X-Bz-Server-Side-Encryption-Customer-Key": "oXT+BeSiADWQlDFSsmJ7bkoH+wpdSnacsUbg2291pdU=",
          "X-Bz-Server-Side-Encryption-Customer-Key-Md5": "Q/JFlAIOhwbQwW9OS+YGcw==",
      }
  });

  if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export class BackblazeContentStorage extends ContentStorageBase {
  constructor() {
    super();
  }

  async readBlob(id: ContentId): Promise<Blob> {
    const {url} = await getDownloadUrl(id);
    return await fetch(url, {
      method: 'GET',
      headers: {
          "X-Bz-Server-Side-Encryption-Customer-Algorithm": "AES256",
          "X-Bz-Server-Side-Encryption-Customer-Key": "oXT+BeSiADWQlDFSsmJ7bkoH+wpdSnacsUbg2291pdU=",
          "X-Bz-Server-Side-Encryption-Customer-Key-Md5": "Q/JFlAIOhwbQwW9OS+YGcw==",
      }
    }).then(response => response.blob());
  }

  async writeBlob(blob: Blob): Promise<ContentId> {
    const sha1 = await blobToSha1(blob);
    const id = `${sha1}.blob` as ContentId;

    try {
      const {url, token, filename} = await getUploadUrl(id);
      if (url == "") {
        // すでにある
        console.log("File already exists, skipping...");
        return id;
      }

      const response = await fetch(url,{
        method: "POST",
        mode: "cors",
        body: blob,
        headers: {
          "Content-Type": "b2/x-auto",
          "Authorization": token,
          "X-Bz-File-Name": filename,
          "X-Bz-Content-Sha1": sha1,
          "X-Bz-Server-Side-Encryption-Customer-Algorithm": "AES256",
          "X-Bz-Server-Side-Encryption-Customer-Key": "oXT+BeSiADWQlDFSsmJ7bkoH+wpdSnacsUbg2291pdU=",
          "X-Bz-Server-Side-Encryption-Customer-Key-Md5": "Q/JFlAIOhwbQwW9OS+YGcw==",
        },
      });
      console.log(response);
    } catch (error) {
      console.error("Fetch threw an error:", error)
    }
    return id;
  }

  async readCanvas(id: string): Promise<HTMLCanvasElement> {
    const {url} = await getDownloadUrl(`${id}.png`);
    console.log(url);

    const image = new Image();
    image.crossOrigin = 'anonymous'; 
    image.src = await fetchImageWithHeaders(url);
    await image.decode();
    return createCanvasFromImage(image);
  }

  async writeCanvas(canvas: HTMLCanvasElement): Promise<ContentId> {
    const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Failed to convert canvas to Blob.'));
            }
        }, 'image/png');
    });
    console.log(canvas.width, canvas.height);
    console.log("blob.length: ", blob.size);
    const sha1 = await blobToSha1(blob);
    const id = `${sha1}.blob` as ContentId;

    try {
      const {url, token, filename} = await getUploadUrl(id);
      console.log(url, token, filename);
      if (url == "") {
        // すでにある
        console.log("File already exists, skipping...");
        return id;
      }

      const response = await fetch(url,{
        method: "POST",
        mode: "cors",
        body: blob,
        headers: {
          "Content-Type": "b2/x-auto",
          "Authorization": token,
          "X-Bz-File-Name": filename,
          "X-Bz-Content-Sha1": sha1,
          "X-Bz-Server-Side-Encryption-Customer-Algorithm": "AES256",
          "X-Bz-Server-Side-Encryption-Customer-Key": "oXT+BeSiADWQlDFSsmJ7bkoH+wpdSnacsUbg2291pdU=",
          "X-Bz-Server-Side-Encryption-Customer-Key-Md5": "Q/JFlAIOhwbQwW9OS+YGcw==",
        },
      });
      console.log(response);
    } catch (error) {
      console.error("Fetch threw an error:", error)
    }
    return id;
  }

  async erase(id: string): Promise<void> {
    await eraseFile(id)  
  }
}
