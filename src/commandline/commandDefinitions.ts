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
import { rosterOpen, hireCharacterByName, saveCharacterToRoster, rosterNamesCache, prefetchRosterNames } from '../notebook/rosterStore';
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

// ── 引数スペック ──────────────────────────────────

export interface ArgSpec {
  type: ArgType;
  required: boolean;
}

// ── 返り値型(ADT) ────────────────────────────────

export type ResultType =
  | { tag: 'None' }
  | { tag: 'Theme' }
  | { tag: 'Plot' }
  | { tag: 'Scenario' }
  | { tag: 'Characters' }
  ;

export function resultTypeLabel(t: ResultType): string {
  switch (t.tag) {
    case 'None': return '';
    case 'Theme': return '{ theme: string }';
    case 'Plot': return '{ plot: string }';
    case 'Scenario': return '{ scenario: string }';
    case 'Characters': return '{ characters: { name, personality, appearance }[] }';
  }
}

export function collectResult(t: ResultType): unknown {
  if (t.tag === 'None') return undefined;
  const book = get(mainBook);
  if (!book) return undefined;
  const nb = book.notebook;
  switch (t.tag) {
    case 'Theme':
      return { theme: nb.theme };
    case 'Plot':
      return { plot: nb.plot };
    case 'Scenario':
      return { scenario: nb.scenario };
    case 'Characters':
      return { characters: nb.characters.map(c => ({ name: c.name, personality: c.personality, appearance: c.appearance })) };
  }
}

// ── コマンド定義 ──────────────────────────────────

export interface CommandDef {
  name: string;
  description: string;
  args: ArgSpec[];
  result: ResultType;
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
    try {
      const hired = await hireCharacterByName(fs, book.notebook, name, () => { mainBook.set(get(mainBook)); });
      if (!hired) {
        toastStore.trigger({ message: `Rosterに "${name}" が見つかりません`, timeout: 1500 });
        return;
      }
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
    result: { tag: 'None' },
    action: newPageAction,
  },
  {
    name: 'new-book',
    description: '新しいブックを作成',
    args: [],
    result: { tag: 'None' },
    action: newBookAction,
  },
  {
    name: 'genai-open',
    description: 'ノートブックを開く',
    args: [],
    result: { tag: 'None' },
    action: genaiOpenAction,
  },
  {
    name: 'genai-theme',
    description: 'テーマを設定/AI生成',
    args: [{ type: { tag: 'FreeText', label: 'text' }, required: false }],
    result: { tag: 'Theme' },
    action: genaiThemeAction,
  },
  {
    name: 'genai-plot',
    description: 'プロットを設定/AI生成',
    args: [{ type: { tag: 'FreeText', label: 'text' }, required: false }],
    result: { tag: 'Plot' },
    action: genaiPlotAction,
  },
  {
    name: 'genai-scenario',
    description: 'シナリオを設定/AI生成',
    args: [{ type: { tag: 'FreeText', label: 'text' }, required: false }],
    result: { tag: 'Scenario' },
    action: genaiScenarioAction,
  },
  {
    name: 'genai-characters',
    description: 'キャラクターをAI生成(全置換)',
    args: [],
    result: { tag: 'Characters' },
    action: genaiCharactersAction,
  },
  {
    name: 'genai-characters-add',
    description: 'キャラクターをAI生成(マージ)',
    args: [],
    result: { tag: 'Characters' },
    action: genaiCharactersAddAction,
  },
  {
    name: 'genai-characters-blank',
    description: '空キャラクターを追加',
    args: [{ type: { tag: 'FreeText', label: 'name' }, required: false }],
    result: { tag: 'None' },
    action: genaiCharactersBlankAction,
  },
  {
    name: 'genai-characters-remove',
    description: 'キャラクターを削除',
    args: [{ type: { tag: 'CharacterName' }, required: true }],
    result: { tag: 'None' },
    action: genaiCharactersRemoveAction,
  },
  {
    name: 'genai-characters-hire',
    description: 'Rosterからキャラクターを雇用',
    args: [{ type: { tag: 'RosterCharacterName' }, required: false }],
    result: { tag: 'None' },
    action: genaiCharactersHireAction,
  },
  {
    name: 'genai-characters-register',
    description: 'キャラクターをRosterに登録',
    args: [{ type: { tag: 'CharacterName' }, required: true }],
    result: { tag: 'None' },
    action: genaiCharactersRegisterAction,
  },
];
