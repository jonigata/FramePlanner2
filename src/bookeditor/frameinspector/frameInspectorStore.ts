import { type Writable, writable, get } from "svelte/store";
import type { FrameElement } from "../../lib/layeredCanvas/dataModels/frameTree";
import { calculatePhysicalLayout, findLayoutOf } from "../../lib/layeredCanvas/dataModels/frameTree";
import { Film } from "../../lib/layeredCanvas/dataModels/film";
import { ImageMedia } from "../../lib/layeredCanvas/dataModels/media";
import type { Page } from '../../lib/book/book';
import { trapezoidBoundingRect } from "../../lib/layeredCanvas/tools/geometry/trapezoid";
import { minimumBoundingScale } from "../../lib/layeredCanvas/tools/geometry/geometry";
import { toastStore } from '@skeletonlabs/skeleton';
import { punchFilm } from '../../utils/punchImage';
import { upscaleFilm } from '../../utils/upscaleImage';
import { outPaintFilm, calculateFramePadding } from '../../utils/outPaintFilm';
import { generateMovie } from '../../utils/generateMovie';
import { onlineStatus } from "../../utils/accountStore";
import { loading } from '../../utils/loadingStore';
import { toolTipRequest } from '../../utils/passiveToolTipStore';
import { commit, delayedCommiter } from '../operations/commit';

type FrameInspectorCommand = "generate" | "scribble" | "punch" | "outpainting" | "video" | "upscale";

export type FrameInspectorPosition = {
  center: {x: number, y: number},
  height: number,
  offset: number,
}

export type FrameInspectorTarget = {
  frame: FrameElement,
  page: Page,
  command: FrameInspectorCommand | null,
  commandTargetFilm: Film | null,
}

export const frameInspectorTarget: Writable<FrameInspectorTarget | null> = writable(null);
export const frameInspectorRebuildToken: Writable<number> = writable(0);

// コマンド実行に必要なツールへの参照
let painterRunWithFrame: ((page: Page, frame: FrameElement, film: Film) => Promise<void>) | null = null;
let runImageGenerator: ((prompt: string, filmStack: any, gallery: any) => Promise<{media: any, prompt: string} | null>) | null = null;

// サブスクリプション解除用の関数
let unsubscribe: Function | null = null;

// ツール参照を設定
export function setFrameCommandTools(
  _painterRunWithFrame: (page: Page, frame: FrameElement, film: Film) => Promise<void>,
  _runImageGenerator: (prompt: string, filmStack: any, gallery: any) => Promise<{media: any, prompt: string} | null>
) {
  painterRunWithFrame = _painterRunWithFrame;
  runImageGenerator = _runImageGenerator;
  
  // 既存のサブスクリプションを解除
  if (unsubscribe) {
    unsubscribe();
  }
  
  // 新しいサブスクリプションを開始
  unsubscribe = frameInspectorTarget.subscribe(onFrameCommand);
}

// コマンド処理関数
async function onFrameCommand(fit: FrameInspectorTarget | null) {
  if (!fit || fit.command === null) return;
  
  if (!painterRunWithFrame || !runImageGenerator) {
    console.error("Frame command tools not initialized");
    return;
  }

  delayedCommiter.force();

  // commandを保存してnullにリセット
  const command = fit.command;
  frameInspectorTarget.set({ ...fit, command: null });

  switch (command) {
    case "scribble":
      await modalFrameScribble(fit);
      break;
    case "generate": 
      await modalFrameGenerate(fit);
      break;
    case "punch":
      await punchFrameFilm(fit);
      break;
    case "upscale":
      await upscaleFrameFilm(fit);
      break;
    case "outpainting":
      await outPaintFrameFilm(fit);
      break;
    case "video":
      await modalFrameVideo(fit);
      break;
  } 
  frameInspectorRebuildToken.update(v => v + 1);
}

// 各コマンド実行関数
async function modalFrameScribble(fit: FrameInspectorTarget) {
  if (!painterRunWithFrame) return;
  
  toolTipRequest.set(null);
  await painterRunWithFrame(fit.page, fit.frame, fit.commandTargetFilm!);
  const media = fit.commandTargetFilm!.media;
  if (media instanceof ImageMedia) {
    const canvas = media.drawSource; // HACK: ImageMediaのdrawSourceが実体であることを前提にしている
    (canvas as any)["clean"] = {};
  }
  commit(null);
}

async function modalFrameGenerate(fit: FrameInspectorTarget) {
  if (!runImageGenerator) return;

  toolTipRequest.set(null);
  
  const page = fit.page;
  const leaf = fit.frame;
  const inputPrompt = leaf.prompt || ""; // nullの場合は空文字を使用
  const r = await runImageGenerator(inputPrompt, leaf.filmStack, leaf.gallery);
  if (!r) { return; }

  const pageLayout = calculatePhysicalLayout(page.frameTree, page.paperSize, [0,0]);
  const leafLayout = findLayoutOf(pageLayout, leaf);

  const { media, prompt: outputPrompt } = r;
  const film = new Film(media);
  film.prompt = outputPrompt;

  const frameRect = trapezoidBoundingRect(leafLayout!.corners);
  const scale = minimumBoundingScale(film.media.size, [frameRect[2], frameRect[3]]);
  film.setShiftedScale(page.paperSize, scale);

  fit.frame.filmStack.films.push(film);
  fit.frame.prompt = outputPrompt;
  frameInspectorTarget.set(get(frameInspectorTarget));

  commit(null);
}

async function punchFrameFilm(fit: FrameInspectorTarget) {

  if (get(onlineStatus) !== 'signed-in') {
    toastStore.trigger({ message: `ログインしていないと使えません`, timeout: 3000});
    return;
  }

  const film = fit.commandTargetFilm!;
  if (!(film.media instanceof ImageMedia)) { return; }

  loading.set(true);
  await punchFilm(film);
  commit(null);
  loading.set(false);
}

async function upscaleFrameFilm(fit: FrameInspectorTarget) {

  if (get(onlineStatus) !== 'signed-in') {
    toastStore.trigger({ message: `ログインしていないと使えません`, timeout: 3000});
    return;
  }

  const film = fit.commandTargetFilm!;
  if (!(film.media instanceof ImageMedia)) { return; }

  await upscaleFilm(film);
  commit(null);
  toastStore.trigger({ message: `アップスケールしました`, timeout: 3000});
}

async function outPaintFrameFilm(fit: FrameInspectorTarget) {

  if (get(onlineStatus) !== 'signed-in') {
    toastStore.trigger({ message: `ログインしていないと使えません`, timeout: 3000});
    return;
  }

  const film = fit.commandTargetFilm!;
  if (!(film.media instanceof ImageMedia)) { return; }

  loading.set(true);
  const padding = calculateFramePadding(fit.page, fit.frame, film);
  try {
    const newFilm = await outPaintFilm(film, padding);
    const index = fit.frame.filmStack.films.indexOf(film);
    fit.frame.filmStack.films.splice(index + 1, 0, newFilm!);
    commit(null);
  } catch (e) {
    console.error(e);
    toastStore.trigger({ message: `アウトペインティングに失敗しました`, timeout: 3000});
  } finally {
    loading.set(false);
  }
}

async function modalFrameVideo(fit: FrameInspectorTarget) {
  
  await generateMovie(fit.frame.filmStack, fit.commandTargetFilm!);
  commit(null);
}
