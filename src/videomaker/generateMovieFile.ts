import {
  FFmpeg,
  type FFmpegConfigurationGPLExtended,
} from '@diffusion-studio/ffmpeg-js';

export interface Scene {
  key: number;
  canvas: HTMLCanvasElement;
}

const ffmpeg = new FFmpeg<FFmpegConfigurationGPLExtended>({
  config: 'gpl-extended',
});

async function writeCanvasToFile(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async blob => {
      if (blob) {
        await ffmpeg.writeFile(filename, blob);
        resolve();
      } else {
        reject(new Error('Failed to create Blob from canvas'));
      }
    }, 'image/png');
  });
}

export async function createVideoWithImages(w: number, h: number, fps: number, d: number, scenes: Scene[], reportProgress: (number) => void): Promise<string> {
  console.log('createVideoWithImages', w, h, fps, d);
  // 各画像をファイルシステムに書き込む
  let progress = 0.5;
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    await writeCanvasToFile(scene.canvas, `image${i}.png`);
    progress += 0.25 / scenes.length;
    reportProgress(progress);
  }

  // 各画像の表示時間を設定するファイルを作成
  let fileListString = "";
  let totalDuration = 0;
  for (let i = 0; i < scenes.length; i++) {
    fileListString += `file 'image${i}.png'\n`;
    const nextKey = i < scenes.length - 1 ? scenes[i + 1].key : d;
    const currKey = scenes[i].key;
    const duration = nextKey - currKey;
    fileListString += `duration ${duration.toFixed(2)}\n`;
    totalDuration += duration;
  }
  fileListString += `file 'image${scenes.length - 1}.png'\n`;

  console.log("================ totalDuration", totalDuration);
  console.log(fileListString);

  // ファイルリストをテキストファイルに書き込む
  const fileListFilename = 'filelist.txt';
  const fileListBlob = new Blob([fileListString], { type: 'text/plain' });
  await ffmpeg.writeFile(fileListFilename, fileListBlob);
  reportProgress(0.8);

  // console.log(await ffmpeg.codecs());

  // 画像を連結して動画を作成
  console.log("************************************** B");
  function onProgress(n: number) {
    reportProgress(0.8 + 0.1 * 0.01 * n);
  }
  ffmpeg.onProgress(onProgress);
  await ffmpeg.exec([
    '-f', 'concat', 
    '-safe', '0', 
    '-i', fileListFilename, 
    '-vcodec', 'mpeg4',
    '-s', `${w}x${h}`,
    '-r', `${fps}`,
    'concat.mp4'
  ]);
  ffmpeg.removeOnProgress(onProgress);
  reportProgress(0.9);

  // H.264に変換
  console.log("************************************** C");
  function onProgress2(n: number) {
    reportProgress(0.9 + 0.05 * 0.01 * n);
  }
  ffmpeg.onProgress(onProgress2);
  await ffmpeg.exec([
    '-i', 'concat.mp4',
    '-vcodec', 'libx264',
    '-crf', '23',  // 一般的な品質と圧縮のバランスのためCRF値を23に設定
    '-pix_fmt', 'yuv420p',  // 広範囲のデバイス互換性のためにyuv420pを使用
    '-r', `${fps}`,
    'output.mp4'
  ]);
  ffmpeg.removeOnProgress(onProgress2);
  reportProgress(0.95);

  const result = ffmpeg.readFile('output.mp4');
  if (result.length == 0) {
    throw new Error('Failed to read output.mp4');
  }
  const blob = new Blob([result], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  reportProgress(1.0);
  return url;
}