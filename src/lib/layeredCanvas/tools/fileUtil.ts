import { createCanvasFromBlob, createVideoFromBlob, createVideoFromDataUrl, getFirstFrameOfVideo } from "../tools/imageUtil";

export async function handleDataTransfer(dataTransfer: DataTransfer): Promise<(HTMLCanvasElement | HTMLVideoElement | string)[]> {
  // video/mp4があればそれを優先
  const url = dataTransfer.getData('video/mp4');
  if (url !== "") { 
    console.log("video url", url);
    const video = await createVideoFromDataUrl(url);
    return [video];
  }

  const result = [];
  for (let i = 0; i < dataTransfer.items.length; i++) {
    var file = dataTransfer.files[i];
    console.log(file.type);
    if (file.type.startsWith('image/svg')) { continue; } // 念の為
    if (file.type.startsWith('image/')) {
      console.log("image file", file);
      const canvas = await createCanvasFromBlob(file);
      result.push(canvas);
    }
    if (file.type.startsWith('video/')) {
      console.log("video file", file);
      const video = await createVideoFromBlob(file);
      result.push(video);
    }
    if (file.type.startsWith('text/')) {
      console.log("text file", file);
      const text = await file.text();
      result.push(text);
    }
  }

  return result;
}
