import { get } from 'svelte/store';
import { bookOperators, mainBook } from '../bookeditor/workspaceStore';
import { frameExamples } from '../lib/layeredCanvas/tools/frameExamples';
import { commitBook, newBook, type NotebookOptions, type CharacterLocal } from '../lib/book/book';
import type { CharacterBase } from '../lib/book/types/notebook';
import { newBookToken, gadgetFileSystem } from '../filemanager/fileManagerStore';
import { createPreference } from '../preferences';
import { onlineStatus } from '../utils/accountStore';
import { adviseCharacters } from '../supabase';
import { toastStore } from '@skeletonlabs/skeleton';
import { ulid } from 'ulid';
import { notebookOpen, runAdviseTheme, runAdvisePlot, runAdviseScenario, charactersWaiting } from '../notebook/notebookStore';
import { rosterOpen, loadCharactersFromRoster, saveCharacterToRoster, rosterNamesCache, prefetchRosterNames } from '../notebook/rosterStore';
import type { BookWorkspaceOperators } from '../bookeditor/BookWorkspaceOperators';

// ── 引数型(ADT) ──────────────────────────────────

export type ArgType =
  | { tag: 'PageTemplateName' }
  | { tag: 'FreeText'; label: string }
  | { tag: 'CharacterName' }
  | { tag: 'RosterCharacterName' }
  ;

export function argTypeCandidates(t: ArgType): string[] {
  switch (t.tag) {
    case 'PageTemplateName':
      return Object.keys(frameExamples);
    case 'FreeText':
      return [];
    case 'CharacterName': {
      const book = get(mainBook);
      if (!book) return [];
      return book.notebook.characters.map(c => c.name).filter(n => n);
    }
    case 'RosterCharacterName':
      prefetchRosterNames();
      return get(rosterNamesCache);
  }
}

export function argTypeLabel(t: ArgType): string {
  switch (t.tag) {
    case 'PageTemplateName':
      return 'template-name';
    case 'FreeText':
      return t.label;
    case 'CharacterName':
      return 'name';
    case 'RosterCharacterName':
      return 'name';
  }
}

export function argTypeNeedsQuote(t: ArgType): boolean {
  switch (t.tag) {
    case 'CharacterName':
    case 'RosterCharacterName':
      return true;
    default:
      return false;
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

function findCharacterByName(name: string): CharacterLocal | undefined {
  const book = get(mainBook);
  if (!book) return undefined;
  return book.notebook.characters.find(c => c.name === name);
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

async function genaiCharactersAction(_args: string[]): Promise<void> {
  if (!requireSignedIn()) return;
  const book = get(mainBook);
  if (!book) return;

  notebookOpen.set(true);
  try {
    charactersWaiting.set(true);
    book.notebook.characters = [];
    const newCharacters = await adviseCharacters({ thinker: "gpt4.1", notebook: book.notebook }) as CharacterBase[];
    newCharacters.forEach((c: CharacterBase) => {
      book.notebook.characters.push({ ...c, ulid: ulid(), portrait: null });
    });
    notebookCommit();
  } catch (e) {
    toastStore.trigger({ message: 'キャラクター生成に失敗しました', timeout: 1500 });
    console.error(e);
  } finally {
    charactersWaiting.set(false);
  }
}

async function genaiCharactersAddAction(_args: string[]): Promise<void> {
  if (!requireSignedIn()) return;
  const book = get(mainBook);
  if (!book) return;

  notebookOpen.set(true);
  try {
    charactersWaiting.set(true);
    const newCharacters = await adviseCharacters({ thinker: "gpt4.1", notebook: book.notebook }) as CharacterBase[];
    for (const c of newCharacters) {
      const index = book.notebook.characters.findIndex(v => v.name === c.name);
      if (index < 0) {
        book.notebook.characters.push({ ...c, ulid: ulid(), portrait: null });
      } else {
        Object.assign(book.notebook.characters[index], c);
      }
    }
    notebookCommit();
  } catch (e) {
    toastStore.trigger({ message: 'キャラクター追加に失敗しました', timeout: 1500 });
    console.error(e);
  } finally {
    charactersWaiting.set(false);
  }
}

function genaiCharactersBlankAction(args: string[]): void {
  const book = get(mainBook);
  if (!book) return;

  const name = args.join(' ').trim();
  const c: CharacterLocal = {
    name,
    personality: '',
    appearance: '',
    ulid: ulid(),
    portrait: null,
    themeColor: '#000000',
  };
  book.notebook.characters.push(c);
  notebookCommit();
}

function genaiCharactersRemoveAction(args: string[]): void {
  const book = get(mainBook);
  if (!book) return;

  const name = args.join(' ').trim();
  if (!name) {
    toastStore.trigger({ message: 'キャラクター名を指定してください', timeout: 1500 });
    return;
  }
  const index = book.notebook.characters.findIndex(c => c.name === name);
  if (index < 0) {
    toastStore.trigger({ message: `キャラクター "${name}" が見つかりません`, timeout: 1500 });
    return;
  }
  book.notebook.characters.splice(index, 1);
  notebookCommit();
}

async function genaiCharactersHireAction(args: string[]): Promise<void> {
  const book = get(mainBook);
  if (!book) return;
  const fs = get(gadgetFileSystem);
  if (!fs) {
    toastStore.trigger({ message: 'ファイルシステムが利用できません', timeout: 1500 });
    return;
  }

  const name = args.join(' ').trim();
  if (name) {
    // 名前指定: Rosterから直接取得
    try {
      const rosterCharacters = await loadCharactersFromRoster(fs);
      const found = rosterCharacters.find(c => c.name === name);
      if (!found) {
        toastStore.trigger({ message: `Rosterに "${name}" が見つかりません`, timeout: 1500 });
        return;
      }
      if (book.notebook.characters.find(c => c.ulid === found.ulid)) {
        toastStore.trigger({ message: `"${name}" は既に登録されています`, timeout: 1500 });
        return;
      }
      found.ulid = ulid();
      book.notebook.characters.push(found);
      notebookCommit();
    } catch (e) {
      toastStore.trigger({ message: 'Rosterの読み込みに失敗しました', timeout: 1500 });
      console.error(e);
    }
  } else {
    // 名前省略: Rosterドロワーを開く
    notebookOpen.set(true);
    rosterOpen.set(true);
  }
}

async function genaiCharactersRegisterAction(args: string[]): Promise<void> {
  const book = get(mainBook);
  if (!book) return;
  const fs = get(gadgetFileSystem);
  if (!fs) {
    toastStore.trigger({ message: 'ファイルシステムが利用できません', timeout: 1500 });
    return;
  }

  const name = args.join(' ').trim();
  if (!name) {
    toastStore.trigger({ message: 'キャラクター名を指定してください', timeout: 1500 });
    return;
  }
  const c = findCharacterByName(name);
  if (!c) {
    toastStore.trigger({ message: `キャラクター "${name}" が見つかりません`, timeout: 1500 });
    return;
  }
  try {
    await saveCharacterToRoster(fs, c);
    toastStore.trigger({ message: `"${name}" をRosterに登録しました`, timeout: 1500 });
  } catch (e) {
    toastStore.trigger({ message: 'Roster登録に失敗しました', timeout: 1500 });
    console.error(e);
  }
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
  {
    name: 'genai-characters',
    description: 'キャラクターをAI生成(全置換)',
    args: [],
    action: genaiCharactersAction,
  },
  {
    name: 'genai-characters-add',
    description: 'キャラクターをAI生成(マージ)',
    args: [],
    action: genaiCharactersAddAction,
  },
  {
    name: 'genai-characters-blank',
    description: '空キャラクターを追加',
    args: [{ type: { tag: 'FreeText', label: 'name' }, required: false }],
    action: genaiCharactersBlankAction,
  },
  {
    name: 'genai-characters-remove',
    description: 'キャラクターを削除',
    args: [{ type: { tag: 'CharacterName' }, required: true }],
    action: genaiCharactersRemoveAction,
  },
  {
    name: 'genai-characters-hire',
    description: 'Rosterからキャラクターを雇用',
    args: [{ type: { tag: 'RosterCharacterName' }, required: false }],
    action: genaiCharactersHireAction,
  },
  {
    name: 'genai-characters-register',
    description: 'キャラクターをRosterに登録',
    args: [{ type: { tag: 'CharacterName' }, required: true }],
    action: genaiCharactersRegisterAction,
  },
];
