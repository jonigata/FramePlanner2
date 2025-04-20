import { type Writable, writable, get } from "svelte/store";
import type { FrameElement } from "../../lib/layeredCanvas/dataModels/frameTree";
import { calculatePhysicalLayout, findLayoutOf } from "../../lib/layeredCanvas/dataModels/frameTree";
import { Film } from "../../lib/layeredCanvas/dataModels/film";
import { ImageMedia } from "../../lib/layeredCanvas/dataModels/media";
import type { Page } from '../../lib/book/book';
import { trapezoidBoundingRect } from "../../lib/layeredCanvas/tools/geometry/trapezoid";
import { minimumBoundingScale } from "../../lib/layeredCanvas/tools/geometry/geometry";
import { outPaintFilm, calculateFramePadding } from '../../utils/outPaintFilm';
import { loading } from '../../utils/loadingStore';
import { toastStore } from '@skeletonlabs/skeleton';
import { onlineStatus } from "../../utils/accountStore";
import { commit } from '../operations/commitOperations';
import type { FilmOperationTarget } from '../operations/filmStackOperations';
import {
  setupCommandSubscription,
  handleScribbleCommand,
  handleGenerateCommand,
  handlePunchCommand,
  handleUpscaleCommand,
  handleVideoCommand,
  processCommand
} from '../operations/filmStackOperations';

type FrameInspectorCommand = "generate" | "scribble" | "punch" | "outpainting" | "video" | "upscale";

export interface FrameInspectorTarget extends FilmOperationTarget {
  frame: FrameElement;
  command: FrameInspectorCommand | null;
}

export const frameInspectorTarget: Writable<FrameInspectorTarget | null> = writable(null);
export const frameInspectorRebuildToken: Writable<number> = writable(0);

// コマンド実行に必要なツールへの参照
let painterRunWithFrame: ((page: Page, frame: FrameElement, film: Film) => Promise<void>) | null = null;
let runImageGenerator: ((prompt: string, filmStack: any, gallery: any) => Promise<{media: any, prompt: string} | null>) | null = null;

// サブスクリプション解除用の関数参照用オブジェクト
const unsubscribeRef = { value: null as Function | null };

// ツール参照を設定
export function setFrameCommandTools(
  _painterRunWithFrame: (page: Page, frame: FrameElement, film: Film) => Promise<void>,
  _runImageGenerator: (prompt: string, filmStack: any, gallery: any) => Promise<{media: any, prompt: string} | null>
) {
  painterRunWithFrame = _painterRunWithFrame;
  runImageGenerator = _runImageGenerator;
  
  // 共通ライブラリを使用してサブスクリプション設定
  setupCommandSubscription<FrameInspectorTarget>(
    frameInspectorTarget,
    onFrameCommand,
    unsubscribeRef
  );
}

// コマンド処理関数
async function onFrameCommand(fit: FrameInspectorTarget | null) {
  if (!fit || fit.command === null) return;
  
  if (!painterRunWithFrame || !runImageGenerator) {
    console.error("Frame command tools not initialized");
    return;
  }

  // 共通ライブラリを使用してコマンド処理
  await processCommand<FrameInspectorTarget>(fit, frameInspectorTarget, {
    "scribble": async (target) => handleScribbleCommand(target, painterRunWithFrame!, target.frame),
    "generate": async (target) => handleGenerateCommand(
      target,
      fit.frame.prompt,
      runImageGenerator!,
      (film, target) => {
        const pageLayout = calculatePhysicalLayout(target.page.frameTree, target.page.paperSize, [0,0]);
        const leafLayout = findLayoutOf(pageLayout, target.frame);
        const frameRect = trapezoidBoundingRect(leafLayout!.corners);
        return minimumBoundingScale(film.media.size, [frameRect[2], frameRect[3]]);
      },
      frameInspectorTarget,
      target.frame
    ),
    "punch": handlePunchCommand,
    "upscale": handleUpscaleCommand,
    "outpainting": outPaintFrameFilm,
    "video": handleVideoCommand
  });
  
  frameInspectorRebuildToken.update(v => v + 1);
}

// アウトペインティング処理（フレーム特有の機能）
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

// modalFrameVideo関数は共通化された handleVideoCommand に置き換えられました
