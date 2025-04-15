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

type BubbleInspectorCommand = "generate" | "scribble" | "punch" | "upscale" | "video";

export type BubbleInspectorPosition = {
  center: {x: number, y: number},
  height: number,
  offset: number,
}

export type BubbleInspectorTarget = {
  bubble: Bubble,
  page: Page,
  command: BubbleInspectorCommand | null,
  commandTargetFilm: Film | null,
}

export const bubbleInspectorTarget: Writable<BubbleInspectorTarget | null> = writable(null);
export const bubbleSplitCursor: Writable<number | null> = writable(null);
export const bubbleInspectorRebuildToken: Writable<number> = writable(0);

// コマンド実行に必要なツールへの参照
let commitFn: ((tag: any) => void) | null = null;
let forceCommitFn: (() => void) | null = null;
let painterRunWithBubble: ((page: Page, bubble: Bubble, film: Film) => Promise<void>) | null = null;
let runImageGenerator: ((prompt: string, filmStack: any, gallery: any) => Promise<{media: any, prompt: string} | null>) | null = null;

// サブスクリプション解除用の関数
let unsubscribe: Function | null = null;

// ツール参照を設定
export function setBubbleCommandTools(
  _commitFn: (tag: any) => void,
  _forceCommitFn: () => void,
  _painterRunWithBubble: (page: Page, bubble: Bubble, film: Film) => Promise<void>,
  _runImageGenerator: (prompt: string, filmStack: any, gallery: any) => Promise<{media: any, prompt: string} | null>
) {
  commitFn = _commitFn;
  forceCommitFn = _forceCommitFn;
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
  
  if (!commitFn || !forceCommitFn || !painterRunWithBubble || !runImageGenerator) {
    console.error("Bubble command tools not initialized");
    return;
  }

  forceCommitFn();

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
  } 
  bubbleInspectorRebuildToken.update(v => v + 1);
}

// 各コマンド実行関数
async function modalBubbleScribble(bit: BubbleInspectorTarget) {
  if (!painterRunWithBubble || !commitFn) return;
  
  toolTipRequest.set(null);
  await painterRunWithBubble(bit.page, bit.bubble, bit.commandTargetFilm!);
  commitFn(null);
}

async function modalBubbleGenerate(bit: BubbleInspectorTarget) {
  if (!runImageGenerator || !commitFn) return;

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
  
  commitFn(null);
}

async function punchBubbleFilm(bit: BubbleInspectorTarget) {
  if (!commitFn) return;

  if (get(onlineStatus) !== 'signed-in') {
    toastStore.trigger({ message: `ログインしていないと使えません`, timeout: 3000});
    return;
  }

  const film = bit.commandTargetFilm!;
  if (!(film.media instanceof ImageMedia)) { return; }

  loading.set(true);
  await punchFilm(film);
  commitFn(null);
  loading.set(false);
}

async function upscaleBubbleFilm(bit: BubbleInspectorTarget) {
  if (!commitFn) return;

  if (get(onlineStatus) !== 'signed-in') {
    toastStore.trigger({ message: `ログインしていないと使えません`, timeout: 3000});
    return;
  }

  const film = bit.commandTargetFilm!;
  if (!(film.media instanceof ImageMedia)) { return; }

  await upscaleFilm(film);
  commitFn(null);
  toastStore.trigger({ message: `アップスケールしました`, timeout: 3000});
}
