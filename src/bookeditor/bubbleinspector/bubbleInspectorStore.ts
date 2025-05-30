import { type Writable, writable } from "svelte/store";
import type { Bubble } from "../../lib/layeredCanvas/dataModels/bubble";
import { Film } from "../../lib/layeredCanvas/dataModels/film";

import type { Page } from '../../lib/book/book';
import { minimumBoundingScale } from "../../lib/layeredCanvas/tools/geometry/geometry";
import { commit } from '../operations/commitOperations';
import type { FilmOperationTarget } from '../operations/filmStackOperations';
import {
  setupCommandSubscription,
  handleCoverCommand,
  handleEraserCommand,
  handleInpaintCommand,
  handleTextEditCommand,
  handleScribbleCommand,
  handleGenerateCommand,
  handlePunchCommand,
  handleUpscaleCommand,
  handleVideoCommand,
  processCommand
} from '../operations/filmStackOperations';

type BubbleInspectorCommand = "generate" | "cover" | "scribble" | "punch" | "upscale" | "video" | "split" | "inpaint" | "eraser" | "textedit";

export interface BubbleInspectorTarget extends FilmOperationTarget {
  bubble: Bubble;
  command: BubbleInspectorCommand | null;
  commandArgs?: any; // コマンドの追加パラメータ
}

export const bubbleInspectorTarget: Writable<BubbleInspectorTarget | null> = writable(null);
export const bubbleInspectorRebuildToken: Writable<number> = writable(0);

// コマンド実行に必要なツールへの参照
let painterRunWithBubble: ((page: Page, bubble: Bubble, film: Film) => Promise<void>) | null = null;
let runImageGenerator: ((prompt: string, filmStack: any, gallery: any) => Promise<{media: any, prompt: string} | null>) | null = null;

// サブスクリプション解除用の関数参照用オブジェクト
const unsubscribeRef = { value: null as Function | null };

// ツール参照を設定
export function setBubbleCommandTools(
  _painterRunWithBubble: (page: Page, bubble: Bubble, film: Film) => Promise<void>,
  _runImageGenerator: (prompt: string, filmStack: any, gallery: any) => Promise<{media: any, prompt: string} | null>
) {
  painterRunWithBubble = _painterRunWithBubble;
  runImageGenerator = _runImageGenerator;
  
  // 共通ライブラリを使用してサブスクリプション設定
  setupCommandSubscription<BubbleInspectorTarget>(
    bubbleInspectorTarget,
    onBubbleCommand,
    unsubscribeRef
  );
}

// コマンド処理関数
async function onBubbleCommand(bit: BubbleInspectorTarget | null) {
  if (!bit || bit.command === null) return;
  
  if (!painterRunWithBubble || !runImageGenerator) {
    console.error("Bubble command tools not initialized");
    return;
  }

  // 共通ライブラリを使用してコマンド処理

  await processCommand<BubbleInspectorTarget>(bit, bubbleInspectorTarget, {
    "cover": async (target) => handleCoverCommand(
      target,
      () => {
        const paperSize = target.page.paperSize;
        const bubbleSize = target.bubble.getPhysicalSize(paperSize);
        console.log(bubbleSize);
        const targetSize: [number,number] = [
          Math.ceil(bubbleSize[0] / 128) * 128,
          Math.ceil(bubbleSize[1] / 128) * 128
        ];
        return targetSize;
      },
      bubbleInspectorTarget,
    ),
    "eraser": handleEraserCommand,
    "inpaint": handleInpaintCommand,
    "textedit": handleTextEditCommand,
    "scribble": async (target) => handleScribbleCommand(target, painterRunWithBubble!, target.bubble),
    "generate": async (target) => handleGenerateCommand(
      target,
      target.bubble.prompt,
      runImageGenerator!,
      (film, target) => {
        const paperSize = target.page.paperSize;
        const bubbleSize = target.bubble.getPhysicalSize(paperSize);
        return minimumBoundingScale(film.media.size, bubbleSize);
      },
      bubbleInspectorTarget,
      target.bubble
    ),
    "punch": handlePunchCommand,
    "upscale": handleUpscaleCommand,
    "split": splitBubble,
    "video": handleVideoCommand
  });
  
  bubbleInspectorRebuildToken.update(v => v + 1);
}

// バブルを分割する処理
async function splitBubble(bit: BubbleInspectorTarget) {
  const cursor = bit.commandArgs?.cursor as number;
  if (cursor === undefined || cursor === null) return;
  
  const page = bit.page;
  const oldBubble = bit.bubble;
  const text = oldBubble.text;
  
  // カーソル位置でテキストを分割
  const paperSize = page.paperSize;
  const bubbleSize = oldBubble.getPhysicalSize(paperSize);
  const width = bubbleSize[0];
  const center = oldBubble.getPhysicalCenter(paperSize);
  
  // 新しいバブルを作成
  const newBubble = oldBubble.clone(false);
  newBubble.n_p0 = oldBubble.n_p0;
  newBubble.n_p1 = oldBubble.n_p1;
  newBubble.initOptions();
  newBubble.text = text.slice(cursor).trimStart();
  page.bubbles.push(newBubble);
  
  // 元のバブルのテキストを更新
  oldBubble.text = text.slice(0, cursor).trimEnd();
  
  // バブルの位置を調整
  const c0: [number, number] = [center[0] + width / 2, center[1]];
  const c1: [number, number] = [center[0] - width / 2, center[1]];
  if (oldBubble.direction === 'v') {
    oldBubble.setPhysicalCenter(paperSize, c0);
    newBubble.setPhysicalCenter(paperSize, c1);
  } else {
    oldBubble.setPhysicalCenter(paperSize, c1);
    newBubble.setPhysicalCenter(paperSize, c0);
  }
  
  // バブルのサイズを調整
  const oldSize = oldBubble.calculateFitSize(paperSize);
  oldBubble.setPhysicalSize(paperSize, oldSize);
  const newSize = newBubble.calculateFitSize(paperSize);
  newBubble.setPhysicalSize(paperSize, newSize);
  
  // インスペクタのターゲットを新しいバブルに設定
  bubbleInspectorTarget.set({
    ...bit,
    bubble: newBubble,
    commandArgs: undefined  // コマンド引数をクリア
  });
  
  commit(null);
}
