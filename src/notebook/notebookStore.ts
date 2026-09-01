import { writable, get } from "svelte/store";
import type { Thinker } from "$protocolTypes/adviseTypes.d";
import type { NotebookLocal } from '../lib/book/book';
import { commitBook } from '../lib/book/book';
import { mainBook } from '../bookeditor/workspaceStore';
import { adviseTheme, advisePlot, adviseScenario } from '../supabase';
import { toastStore } from '@skeletonlabs/skeleton';

export const notebookOpen = writable(false);
export const themeWaiting = writable(false);
export const plotWaiting = writable(false);
export const scenarioWaiting = writable(false);
export const charactersWaiting = writable(false);

function notebookCommit(): void {
  const book = get(mainBook);
  if (!book) return;
  commitBook(book, null);
  mainBook.set(book);
}

// 直近に生成したテーマを覚えておき、次の生成時にサーバーへ渡す。
// 似たテーマばかり出るのを避けるためのもので、失われても支障はないためlocalStorageに置く。
const recentThemesKey = 'notebook.recentThemes';
const recentThemesMax = 10;

function loadRecentThemes(): string[] {
  try {
    const json = localStorage.getItem(recentThemesKey);
    if (!json) { return []; }
    const themes = JSON.parse(json);
    return Array.isArray(themes) ? themes.filter(t => typeof t === 'string') : [];
  } catch (e) {
    return [];
  }
}

function pushRecentTheme(theme: string): void {
  try {
    const themes = [theme, ...loadRecentThemes().filter(t => t !== theme)].slice(0, recentThemesMax);
    localStorage.setItem(recentThemesKey, JSON.stringify(themes));
  } catch (e) {
    // 保存できなくてもテーマ生成自体は成立するので無視する
  }
}

export async function runAdviseTheme(notebook: NotebookLocal, thinker: Thinker): Promise<void> {
  try {
    themeWaiting.set(true);
    const r = await adviseTheme({ thinker, notebook, recentThemes: loadRecentThemes() });
    notebook.theme = r.theme;
    notebook.pageNumber = r.pageNumber;
    notebook.format = r.format;
    pushRecentTheme(r.theme);
    notebookCommit();
  } catch (e) {
    toastStore.trigger({ message: 'テーマ生成に失敗しました', timeout: 1500 });
    console.error(e);
    throw e;
  } finally {
    themeWaiting.set(false);
  }
}

export async function runAdvisePlot(notebook: NotebookLocal, thinker: Thinker, instruction: string): Promise<void> {
  try {
    plotWaiting.set(true);
    notebook.plot = await advisePlot({ thinker, notebook, instruction });
    notebookCommit();
  } catch (e) {
    toastStore.trigger({ message: 'プロット生成に失敗しました', timeout: 1500 });
    console.error(e);
    throw e;
  } finally {
    plotWaiting.set(false);
  }
}

export async function runAdviseScenario(notebook: NotebookLocal, thinker: Thinker): Promise<void> {
  try {
    scenarioWaiting.set(true);
    notebook.scenario = await adviseScenario({ thinker, notebook });
    notebookCommit();
  } catch (e) {
    toastStore.trigger({ message: 'シナリオ生成に失敗しました', timeout: 1500 });
    console.error(e);
    throw e;
  } finally {
    scenarioWaiting.set(false);
  }
}
