import { get } from 'svelte/store';
import { toastStore } from '@skeletonlabs/skeleton';
import { ImageMedia } from '../lib/layeredCanvas/dataModels/media';
import { Film } from '../lib/layeredCanvas/dataModels/film';
import { analyticsEvent } from "./analyticsEvent";
import { onlineStatus } from './accountStore';
import { textMask } from '../supabase';
import { makePlainCanvas, createImageFromDataUrl } from '../lib/layeredCanvas/tools/imageUtil';
import { waitDialog } from './waitDialog';

export async function textLiftFilm(film: Film) {
  if (get(onlineStatus) !== "signed-in") {
    toastStore.trigger({ message: `テキスト抽出はサインインしてないと使えません`, timeout: 3000});
    return null;
  }

  if (!(film.media instanceof ImageMedia)) {
    toastStore.trigger({ message: `テキスト抽出は画像のみ使えます`, timeout: 3000});
    return null;
  }
  const imageMedia = film.media as ImageMedia;
  const sourceCanvas = imageMedia.drawSource;

  // APIからテキストマスク情報を取得
  const result = await textMask({ dataUrl: sourceCanvas.toDataURL()});
  console.log(result);

  if (!result.boxes || result.boxes.length === 0) {
    console.log('テキストが検出できませんでした');
    return null;
  }

  // 元の画像と同じサイズの透明なマスク画像キャンバスを作成
  const sourceWidth = sourceCanvas.width;
  const sourceHeight = sourceCanvas.height;
  console.log(sourceWidth, sourceHeight);

  const maskCanvas = makePlainCanvas(sourceWidth, sourceHeight); // 色を指定しないと透明になる
  const ctx = maskCanvas.getContext('2d');
  
  if (!ctx) {
    console.error('キャンバスコンテキストの取得に失敗しました');
    return null;
  }
  
  // 各ボックスごとに処理する
  for (const box of result.boxes) {
/*
    try {
      // Base64形式の文字列を画像に変換
      const maskImage = await createImageFromDataUrl(box.mask);
      console.log("maskImage size: ", maskImage.width, maskImage.height);
      
      // 正規化された座標を実際の画像サイズに変換（0-1000の値から実際のピクセル値へ）
      const { x0, y0, x1, y1 } = box.box_2d;
      const actualX0 = Math.floor(x0 * sourceWidth / 1000);
      const actualY0 = Math.floor(y0 * sourceHeight / 1000);
      const actualX1 = Math.floor(x1 * sourceWidth / 1000);
      const actualY1 = Math.floor(y1 * sourceHeight / 1000);
      const actualWidth = actualX1 - actualX0;
      const actualHeight = actualY1 - actualY0;
      
      console.log(`マスク処理: ${actualX0},${actualY0} - ${actualWidth}x${actualHeight}`);
      
      // 元のマスク形状を維持するために、マスク画像と同じサイズの一時キャンバスを作成
      const tempCanvas = makePlainCanvas(actualWidth, actualHeight);
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) continue;
      
      // マスク画像を一時キャンバスに描画（元の形状を保持）
      tempCtx.drawImage(maskImage, 0, 0, actualWidth, actualHeight);
      
      // ピクセルデータを取得して紫色に変換
      const imageData = tempCtx.getImageData(0, 0, actualWidth, actualHeight);
      const data = imageData.data;
      
      // 各ピクセルのRGBA値を紫色に変換（アルファ値は維持）
      for (let i = 0; i < data.length; i += 4) {
        // マスク画像はモノクロ画像なので、Rで判定
        if (data[i + 0] > 128) {
          data[i + 0] = 128; // R
          data[i + 1] = 0;   // G
          data[i + 2] = 128; // B
          data[i + 3] = 128;
        } else {
          data[i + 3] = 0;
        }
      }
      
      // 変換した画像データを一時キャンバスに戻す
      tempCtx.putImageData(imageData, 0, 0);
      
      // メインキャンバスに一時キャンバスを合成
      ctx!.drawImage(tempCanvas, actualX0, actualY0);
      
    } catch (error) {
      console.error('マスク処理エラー:', error);
    }
*/
  }
  
  // すべてのボックスに矩形ストロークを描画
  ctx!.strokeStyle = 'rgba(75, 0, 130, 0.8)'; // 濃い紫色
  ctx!.lineWidth = 2;
  
  for (const box of result.boxes) {
    try {
      // 正規化された座標を実際の画像サイズに変換
      const { x0, y0, x1, y1 } = box.box_2d;
      const actualX0 = Math.floor(x0 * sourceWidth / 1000);
      const actualY0 = Math.floor(y0 * sourceHeight / 1000);
      const actualX1 = Math.floor(x1 * sourceWidth / 1000);
      const actualY1 = Math.floor(y1 * sourceHeight / 1000);
      const actualWidth = actualX1 - actualX0;
      const actualHeight = actualY1 - actualY0;
      
      // 矩形を描画
      ctx!.strokeStyle = 'yellow';
      ctx!.strokeRect(actualX0, actualY0, actualWidth, actualHeight);
    } catch (error) {
      console.error('矩形描画エラー:', error);
    }
  }
  
  console.log('マスク画像キャンバスが作成されました', maskCanvas);
  analyticsEvent('textlift');
  
  const newCanvas = document.createElement('canvas');
  newCanvas.width = sourceCanvas.width;
  newCanvas.height = sourceCanvas.height;
  console.log(newCanvas);
  const ctx2 = newCanvas.getContext('2d')!;
  ctx2.drawImage(sourceCanvas, 0, 0);
  ctx2.drawImage(maskCanvas, 0, 0);

  await waitDialog<{}>('canvasBrowser', { canvas: newCanvas });

  // 作成したキャンバスを返却
  return maskCanvas;
}
