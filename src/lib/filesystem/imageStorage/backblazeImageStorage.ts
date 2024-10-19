import { createCanvasFromImage } from '../../../utils/imageUtil';
import { blobToSha1 } from '../../../lib/Misc';
import { ImageStorageBase, type ImageId } from './imageStorage';
import { getUploadUrl, getDownloadUrl } from '../../../firebase';

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

export class BackblazeImageStorage extends ImageStorageBase {
  constructor() {
    super();
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

  async writeCanvas(canvas: HTMLCanvasElement): Promise<ImageId> {
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
    const id = await blobToSha1(blob);

    try {
      const {url, token, filename} = await getUploadUrl(`${id}.png`);
      console.log(url, token, filename);
      if (url == "") {
        // すでにある
        console.log("File already exists, skipping...");
        return id as ImageId;
      }

      const response = await fetch(url,{
        method: "POST",
        mode: "cors",
        body: blob,
        headers: {
          "Content-Type": "b2/x-auto",
          "Authorization": token,
          "X-Bz-File-Name": filename,
          "X-Bz-Content-Sha1": id,
          "X-Bz-Server-Side-Encryption-Customer-Algorithm": "AES256",
          "X-Bz-Server-Side-Encryption-Customer-Key": "oXT+BeSiADWQlDFSsmJ7bkoH+wpdSnacsUbg2291pdU=",
          "X-Bz-Server-Side-Encryption-Customer-Key-Md5": "Q/JFlAIOhwbQwW9OS+YGcw==",
        },
      });
      console.log(response);
    } catch (error) {
      console.error("Fetch threw an error:", error)
    }
    return id as ImageId;
  }
}
