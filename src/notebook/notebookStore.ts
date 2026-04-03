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

function notebookCommit(): void {
  const book = get(mainBook);
  if (!book) return;
  commitBook(book, null);
  mainBook.set(book);
}

export async function runAdviseTheme(notebook: NotebookLocal, thinker: Thinker): Promise<void> {
  try {
    themeWaiting.set(true);
    const r = await adviseTheme({ thinker, notebook });
    notebook.theme = r.theme;
    notebook.pageNumber = r.pageNumber;
    notebook.format = r.format;
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
