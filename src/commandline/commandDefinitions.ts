import { get } from 'svelte/store';
import { bookOperators, mainBook } from '../bookeditor/workspaceStore';
import { frameExamples } from '../lib/layeredCanvas/tools/frameExamples';
import { commitBook, newBook, type NotebookOptions } from '../lib/book/book';
import { newBookToken } from '../filemanager/fileManagerStore';
import { createPreference } from '../preferences';
import { onlineStatus } from '../utils/accountStore';
import { toastStore } from '@skeletonlabs/skeleton';
import { notebookOpen, runAdviseTheme, runAdvisePlot, runAdviseScenario } from '../notebook/notebookStore';
import type { BookWorkspaceOperators } from '../bookeditor/BookWorkspaceOperators';

// ── 引数型(ADT) ──────────────────────────────────

export type ArgType =
  | { tag: 'PageTemplateName' }
  | { tag: 'FreeText'; label: string }
  ;

export function argTypeCandidates(t: ArgType): string[] {
  switch (t.tag) {
    case 'PageTemplateName':
      return Object.keys(frameExamples);
    case 'FreeText':
      return [];
  }
}

export function argTypeLabel(t: ArgType): string {
  switch (t.tag) {
    case 'PageTemplateName':
      return 'template-name';
    case 'FreeText':
      return t.label;
  }
}

// ── 引数スペック ──────────────────────────────────

export interface ArgSpec {
  type: ArgType;
  required: boolean;
}

// ── コマンド定義 ──────────────────────────────────

export interface CommandDef {
  name: string;
  description: string;
  args: ArgSpec[];
  action: (args: string[]) => void;
}

export function buildUsage(def: CommandDef): string {
  const argParts = def.args.map(a => {
    const label = argTypeLabel(a.type);
    return a.required ? `<${label}>` : `[${label}]`;
  });
  return [def.name, ...argParts].join(' ');
}

// ── ヘルパー ────────────────────────────────────

function requireSignedIn(): boolean {
  if (get(onlineStatus) !== 'signed-in') {
    toastStore.trigger({ message: 'ログインが必要です', timeout: 1500 });
    return false;
  }
  return true;
}

function notebookCommit(): void {
  const book = get(mainBook);
  if (!book) return;
  commitBook(book, null);
  mainBook.set(book);
}

// ── アクション ───────────────────────────────────

function newPageAction(args: string[]): void {
  const ops = get(bookOperators) as BookWorkspaceOperators | null;
  const book = get(mainBook);
  if (!ops || !book) return;

  const focusedPage = ops.getFocusedPage();
  const index = book.pages.indexOf(focusedPage);
  const templateName = args[0]?.trim();
  if (templateName && templateName in frameExamples) {
    ops.insertPageWithTemplate(index + 1, templateName);
  } else {
    ops.insertPage(index + 1);
  }
}

async function newBookAction(_args: string[]): Promise<void> {
  const formatPref = createPreference<"4koma" | "standard">('imaging', 'notebookFormat');
  const pageNumberPref = createPreference<number | null>('imaging', 'notebookPageNumber');
  const options: NotebookOptions = {
    format: (await formatPref.get()) ?? "standard",
    pageNumber: (await pageNumberPref.get()) ?? null,
  };
  newBookToken.set(newBook("not visited", "shortcut-", "standard", options));
}

async function genaiThemeAction(args: string[]): Promise<void> {
  if (!requireSignedIn()) return;
  const book = get(mainBook);
  if (!book) return;

  const text = args.join(' ').trim();
  if (text) {
    book.notebook.theme = text;
    notebookCommit();
  } else {
    notebookOpen.set(true);
    try { await runAdviseTheme(book.notebook, "gpt4.1"); } catch (_) {}
  }
}

async function genaiPlotAction(args: string[]): Promise<void> {
  if (!requireSignedIn()) return;
  const book = get(mainBook);
  if (!book) return;

  const text = args.join(' ').trim();
  if (text) {
    book.notebook.plot = text;
    notebookCommit();
  } else {
    notebookOpen.set(true);
    try { await runAdvisePlot(book.notebook, "gpt4.1", ''); } catch (_) {}
  }
}

async function genaiScenarioAction(args: string[]): Promise<void> {
  if (!requireSignedIn()) return;
  const book = get(mainBook);
  if (!book) return;

  const text = args.join(' ').trim();
  if (text) {
    book.notebook.scenario = text;
    notebookCommit();
  } else {
    notebookOpen.set(true);
    try { await runAdviseScenario(book.notebook, "gpt4.1"); } catch (_) {}
  }
}

function genaiOpenAction(_args: string[]): void {
  notebookOpen.set(true);
}

// ── コマンドテーブル ─────────────────────────────

export const commandTable: CommandDef[] = [
  {
    name: 'new-page',
    description: '新しいページを追加',
    args: [{ type: { tag: 'PageTemplateName' }, required: false }],
    action: newPageAction,
  },
  {
    name: 'new-book',
    description: '新しいブックを作成',
    args: [],
    action: newBookAction,
  },
  {
    name: 'genai-open',
    description: 'ノートブックを開く',
    args: [],
    action: genaiOpenAction,
  },
  {
    name: 'genai-theme',
    description: 'テーマを設定/AI生成',
    args: [{ type: { tag: 'FreeText', label: 'text' }, required: false }],
    action: genaiThemeAction,
  },
  {
    name: 'genai-plot',
    description: 'プロットを設定/AI生成',
    args: [{ type: { tag: 'FreeText', label: 'text' }, required: false }],
    action: genaiPlotAction,
  },
  {
    name: 'genai-scenario',
    description: 'シナリオを設定/AI生成',
    args: [{ type: { tag: 'FreeText', label: 'text' }, required: false }],
    action: genaiScenarioAction,
  },
];
