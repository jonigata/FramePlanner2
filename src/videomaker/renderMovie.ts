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

export async function createVideoWithImages(w: number, h: number, fps: number, d: number, scenes: Scene[]): Promise<string> {
  console.log('createVideoWithImages', w, h, fps, d);
  // 各画像をファイルシステムに書き込む
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    await writeCanvasToFile(scene.canvas, `image${i}.png`);
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

  // console.log(await ffmpeg.codecs());

  // 画像を連結して動画を作成
  console.log("************************************** B");
  await ffmpeg.exec([
    '-f', 'concat', 
    '-safe', '0', 
    '-i', fileListFilename, 
    '-vcodec', 'mpeg4',
    '-s', `${w}x${h}`,
    '-r', `${fps}`,
    'concat.mp4'
  ]);

  // H.264に変換
  console.log("************************************** C");
  await ffmpeg.exec([
    '-i', 'concat.mp4',
    '-vcodec', 'libx264',
    '-crf', '23',  // 一般的な品質と圧縮のバランスのためCRF値を23に設定
    '-pix_fmt', 'yuv420p',  // 広範囲のデバイス互換性のためにyuv420pを使用
    '-r', `${fps}`,
    'output.mp4'
  ]);

  const result = ffmpeg.readFile('output.mp4');
  const blob = new Blob([result], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  return url;
}