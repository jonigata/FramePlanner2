import { get } from "svelte/store";
import { Film } from "../../lib/layeredCanvas/dataModels/film";
import { ImageMedia } from "../../lib/layeredCanvas/dataModels/media";
import type { Page } from '../../lib/book/book';
import { toastStore } from '@skeletonlabs/skeleton';
import { punchFilm } from '../../utils/punchImage';
import { upscaleFilm } from '../../utils/upscaleImage';
import { onlineStatus } from "../../utils/accountStore";
import { loading } from '../../utils/loadingStore';
import { toolTipRequest } from '../../utils/passiveToolTipStore';
import { commit, delayedCommiter } from './commitOperations';
import { generateMovie } from '../../utils/generateMovie';
import { makePlainCanvas } from "../../lib/layeredCanvas/tools/imageUtil";
import { eraserFilm } from "../../utils/eraserFilm";


// 共通インターフェース - フィルムオペレーション対象
export interface FilmOperationTarget {
  page: Page;
  commandTargetFilm: Film | null;
  filmStack: { films: Film[] };
  prompt?: string;
}

// コマンド処理のサブスクリプション設定関数
export function setupCommandSubscription<T extends FilmOperationTarget>(
  targetStore: { subscribe: (callback: (target: T | null) => void) => Function },
  commandHandler: (target: T | null) => void,
  unsubscribeRef: { value: Function | null }
): void {
  // 既存のサブスクリプションを解除
  if (unsubscribeRef.value) {
    unsubscribeRef.value();
  }
  
  // 新しいサブスクリプションを開始
  unsubscribeRef.value = targetStore.subscribe(commandHandler);
}

// 描画モーダルの共通処理
export async function handleScribbleCommand<T extends FilmOperationTarget>(
  target: T,
  painterRun: (page: Page, element: any, film: Film) => Promise<void>,
  element: any
): Promise<void> {
  if (!painterRun) return;
  console.log("handleScribbleCommand", target, target.page?.id);
  
  toolTipRequest.set(null);
  await painterRun(target.page, element, target.commandTargetFilm!);
  const media = target.commandTargetFilm!.media;
  if (media instanceof ImageMedia) {
    const canvas = media.drawSource;
    (canvas as any)["clean"] = {};
  }
  commit(null);
}

// 画像生成の共通処理
export async function handleGenerateCommand<T extends FilmOperationTarget>(
  target: T,
  inputPrompt: string,
  runImageGenerator: (prompt: string, filmStack: any, gallery: any) => Promise<{media: any, prompt: string} | null>,
  calculateScale: (film: Film, target: T) => number,
  targetStore: any,
  element: any
): Promise<void> {
  if (!runImageGenerator) return;

  toolTipRequest.set(null);
  
  const r = await runImageGenerator(inputPrompt, target.filmStack, element.gallery);
  if (!r) { return; }

  const { media, prompt: outputPrompt } = r;
  const film = new Film(media);
  film.prompt = outputPrompt;
  
  const scale = calculateScale(film, target);
  film.setShiftedScale(target.page.paperSize, scale);

  target.filmStack.films.push(film);
  if (element.prompt !== undefined) {
    element.prompt = outputPrompt;
  }
  
  targetStore.set(get(targetStore));
  commit(null);
}

// パンチ処理の共通処理
export async function handlePunchCommand<T extends FilmOperationTarget>(
  target: T
): Promise<void> {
  if (get(onlineStatus) !== 'signed-in') {
    toastStore.trigger({ message: `ログインしていないと使えません`, timeout: 3000});
    return;
  }

  const film = target.commandTargetFilm!;
  if (!(film.media instanceof ImageMedia)) { return; }

  loading.set(true);
  await punchFilm(film);
  commit(null);
  loading.set(false);
}

// アップスケール処理の共通処理
export async function handleUpscaleCommand<T extends FilmOperationTarget>(
  target: T
): Promise<void> {
  if (get(onlineStatus) !== 'signed-in') {
    toastStore.trigger({ message: `ログインしていないと使えません`, timeout: 3000});
    return;
  }

  const film = target.commandTargetFilm!;
  if (!(film.media instanceof ImageMedia)) { return; }

  await upscaleFilm(film);
  commit(null);
  toastStore.trigger({ message: `アップスケールしました`, timeout: 3000});
}

// 動画生成の共通処理
export async function handleVideoCommand<T extends FilmOperationTarget & { bubble?: any, frame?: any }>(
  target: T,
): Promise<void> {
  // frameまたはbubbleに実際のFilmStackオブジェクトが含まれている
  const actualFilmStack = target.frame?.filmStack || target.bubble?.filmStack;
  if (!actualFilmStack) {
    console.error("No valid filmStack found in target");
    return;
  }
  
  await generateMovie(actualFilmStack, target.commandTargetFilm!);
  commit(null);
}

export async function handleCoverCommand<T extends FilmOperationTarget>(
  target: T,
  calculateSize: () => [number, number],
  targetStore: any
): Promise<void> {
  const size = calculateSize();
  console.log("handleCoverCommand", size);
  const media = new ImageMedia(makePlainCanvas(size[0], size[1], "#ffffff00"));
  const film = new Film(media);
  film.setShiftedScale(target.page.paperSize, 1.0);
  
  target.filmStack.films.push(film);
  
  targetStore.set(get(targetStore));
}

export async function handleEraserCommand<T extends FilmOperationTarget>(
  target: T
): Promise<void> {
  await eraserFilm(target.commandTargetFilm!);
  commit(null);
  loading.set(false);
}


// コマンド処理の共通フロー
export function processCommand<T extends FilmOperationTarget & { command: string | null }>(
  target: T | null,
  targetStore: any,
  handlers: Record<string, (target: T) => Promise<void>>
): Promise<void> | undefined {
  if (!target || target.command === null) return;

  delayedCommiter.force();

  // commandを保存してnullにリセット
  const command = target.command;
  targetStore.set({ ...target, command: null });

  // コマンドハンドラを実行
  const handler = handlers[command];
  if (handler) {
    return handler(target);
  }
  
  return undefined;
}