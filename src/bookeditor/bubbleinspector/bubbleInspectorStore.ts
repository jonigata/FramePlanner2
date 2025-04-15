import { type Writable, writable, get } from "svelte/store";
import type { Bubble } from "../../lib/layeredCanvas/dataModels/bubble";
import { Film } from "../../lib/layeredCanvas/dataModels/film";
import { ImageMedia } from "../../lib/layeredCanvas/dataModels/media";
import type { Page } from '../../lib/book/book';
import { minimumBoundingScale } from "../../lib/layeredCanvas/tools/geometry/geometry";
import { toastStore } from '@skeletonlabs/skeleton';
import { punchFilm } from '../../utils/punchImage';
import { upscaleFilm } from '../../utils/upscaleImage';
import { onlineStatus } from "../../utils/accountStore";
import { loading } from '../../utils/loadingStore';
import { toolTipRequest } from '../../utils/passiveToolTipStore';
import { commit, delayedCommiter } from '../operations/commitOperations';

type BubbleInspectorCommand = "generate" | "scribble" | "punch" | "upscale" | "video" | "split";

export type BubbleInspectorTarget = {
  bubble: Bubble,
  page: Page,
  command: BubbleInspectorCommand | null,
  commandTargetFilm: Film | null,
  commandArgs?: any, // コマンドの追加パラメータ
}

export const bubbleInspectorTarget: Writable<BubbleInspectorTarget | null> = writable(null);
export const bubbleInspectorRebuildToken: Writable<number> = writable(0);

// コマンド実行に必要なツールへの参照
let painterRunWithBubble: ((page: Page, bubble: Bubble, film: Film) => Promise<void>) | null = null;
let runImageGenerator: ((prompt: string, filmStack: any, gallery: any) => Promise<{media: any, prompt: string} | null>) | null = null;

// サブスクリプション解除用の関数
let unsubscribe: Function | null = null;

// ツール参照を設定
export function setBubbleCommandTools(
  _painterRunWithBubble: (page: Page, bubble: Bubble, film: Film) => Promise<void>,
  _runImageGenerator: (prompt: string, filmStack: any, gallery: any) => Promise<{media: any, prompt: string} | null>
) {
  painterRunWithBubble = _painterRunWithBubble;
  runImageGenerator = _runImageGenerator;
  
  // 既存のサブスクリプションを解除
  if (unsubscribe) {
    unsubscribe();
  }
  
  // 新しいサブスクリプションを開始
  unsubscribe = bubbleInspectorTarget.subscribe(onBubbleCommand);
}

// コマンド処理関数
async function onBubbleCommand(bit: BubbleInspectorTarget | null) {
  if (!bit || bit.command === null) return;
  
  if (!painterRunWithBubble || !runImageGenerator) {
    console.error("Bubble command tools not initialized");
    return;
  }

  delayedCommiter.force();

  // commandを保存してnullにリセット
  const command = bit.command;
  bubbleInspectorTarget.set({ ...bit, command: null });

  switch (command) {
    case "scribble":
      await modalBubbleScribble(bit);
      break;
    case "generate":
      await modalBubbleGenerate(bit);
      break;
    case "punch":
      await punchBubbleFilm(bit);
      break;
    case "upscale":
      await upscaleBubbleFilm(bit);
      break;
    case "split":
      await splitBubble(bit);
      break;
  }
  bubbleInspectorRebuildToken.update(v => v + 1);
}

// 各コマンド実行関数
async function modalBubbleScribble(bit: BubbleInspectorTarget) {
  if (!painterRunWithBubble) return;
  
  toolTipRequest.set(null);
  await painterRunWithBubble(bit.page, bit.bubble, bit.commandTargetFilm!);
  commit(null);
}

async function modalBubbleGenerate(bit: BubbleInspectorTarget) {
  if (!runImageGenerator) return;

  const bubble = bit.bubble;
  const inputPrompt = bubble.prompt || "";
  const r = await runImageGenerator(inputPrompt, bubble.filmStack, bubble.gallery);
  if (r == null) { return; }
  
  const film = new Film(r.media);
  const paperSize = bit.page.paperSize;
  const bubbleSize = bubble.getPhysicalSize(paperSize);
  const scale = minimumBoundingScale(film.media.size, bubbleSize);
  film.setShiftedScale(paperSize, scale);
  
  bubble.filmStack.films.push(film);
  bubble.prompt = r.prompt;
  bubbleInspectorTarget.set(get(bubbleInspectorTarget));
  
  commit(null);
}

async function punchBubbleFilm(bit: BubbleInspectorTarget) {

  if (get(onlineStatus) !== 'signed-in') {
    toastStore.trigger({ message: `ログインしていないと使えません`, timeout: 3000});
    return;
  }

  const film = bit.commandTargetFilm!;
  if (!(film.media instanceof ImageMedia)) { return; }

  loading.set(true);
  await punchFilm(film);
  commit(null);
  loading.set(false);
}

async function upscaleBubbleFilm(bit: BubbleInspectorTarget) {

  if (get(onlineStatus) !== 'signed-in') {
    toastStore.trigger({ message: `ログインしていないと使えません`, timeout: 3000});
    return;
  }

  const film = bit.commandTargetFilm!;
  if (!(film.media instanceof ImageMedia)) { return; }

  await upscaleFilm(film);
  commit(null);
  toastStore.trigger({ message: `アップスケールしました`, timeout: 3000});
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
