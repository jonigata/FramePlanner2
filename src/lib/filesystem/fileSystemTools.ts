const isNode = typeof window === 'undefined';

// テストのときのNodeのBlobはぶっ壊れてるので、なんとかする
function toBrowserBlob(blob: unknown): Blob {
  if (blob instanceof globalThis.Blob) {
    return blob;
  } else {
    return new globalThis.Blob([blob as any], {
      type: (blob as any).type || "application/octet-stream"
    });
  }
}

function dataURLtoBlobFallback(dataURL: string): Blob {
  const [meta, base64Data] = dataURL.split(',');
  const mimeMatch = meta.match(/data:([^;]+);base64/);
  if (!mimeMatch) throw new Error('Invalid data URL format');

  const mime = mimeMatch[1];
  const binary = atob(base64Data);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export async function dataURLtoBlob(dataURL: string): Promise<Blob> {
  if (isNode) {
    return dataURLtoBlobFallback(dataURL);
  } else {
    const res = await fetch(dataURL);
    const blob = await res.blob();
    return blob;
  }
}


export async function blobToDataURL(blob: Blob): Promise<string> {
  const browserBlob = toBrowserBlob(blob);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(browserBlob);
  });
}
