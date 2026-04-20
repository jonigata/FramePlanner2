import { get } from 'svelte/store';
import { bookOperators, mainBook, mainBookTitle } from '../bookeditor/workspaceStore';
import { frameExamples } from '../lib/layeredCanvas/tools/frameExamples';
import { commitBook, newBook, type NotebookOptions, type CharacterLocal } from '../lib/book/book';
import type { CharacterBase } from '../lib/book/types/notebook';
import { collectImages, collectLeaves } from '../lib/layeredCanvas/dataModels/frameTree';
import { newBookToken, gadgetFileSystem, mainBookFileSystem, loadToken, loadBookFrom, saveBookTo, newFile } from '../filemanager/fileManagerStore';
import type { FileSystem, Folder, BindId, NodeId, Entry } from '../lib/filesystem/fileSystem';
import { makeFolders } from '../lib/filesystem/fileSystem';
import { createPreference } from '../preferences';
import { onlineStatus } from '../utils/accountStore';
import { adviseCharacters } from '../supabase';
import { toastStore } from '@skeletonlabs/skeleton';
import { ulid, decodeTime } from 'ulid';
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
  | { tag: 'FileList' }
  | { tag: 'Notebook' }
  | { tag: 'PagesSummary' }
  | { tag: 'Generic' }
  ;

export function resultTypeLabel(t: ResultType): string {
  switch (t.tag) {
    case 'None': return '';
    case 'Theme': return '{ theme: string }';
    case 'Plot': return '{ plot: string }';
    case 'Scenario': return '{ scenario: string }';
    case 'Characters': return '{ characters: { name, personality, appearance }[] }';
    case 'FileList': return '{ files: { id, name, type, path, createdAt, parentId }[] }';
    case 'Notebook': return '{ theme, plot, scenario, characters: { name, personality, appearance }[] }';
    case 'PagesSummary': return '{ pages: { index, bubbleCount, textLength, filmCount, frameLeafCount, empty }[] }';
    case 'Generic': return '(object)';
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
  action: (args: string[]) => unknown | Promise<unknown>;
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

// ── ファイルシステムヘルパ ───────────────────────

function ulidDecodeTimeSafe(id: string): number {
  try { return decodeTime(id); } catch { return 0; }
}

async function resolveFolder(fs: FileSystem, path: string): Promise<Folder | null> {
  const root = await fs.getRoot();
  const p = path.replace(/^\/+|\/+$/g, '');
  if (p === '') return root;
  try {
    const node = await root.getNodeByPath(p);
    return node.asFolder();
  } catch {
    return null;
  }
}

type FileListItem = {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  createdAt: string;
  parentId: string;
  bindId: string;
};

async function listFolderRecursive(
  folder: Folder,
  prefix: string,
  sinceMs: number,
  out: FileListItem[],
  seen: Set<string>,
): Promise<void> {
  const entries = await folder.list();
  for (const [bindId, name, nodeId] of entries) {
    if (seen.has(nodeId)) continue;
    seen.add(nodeId);
    const node = await folder.fileSystem.getNode(nodeId);
    if (!node) continue;
    const childPath = prefix ? `${prefix}/${name}` : name;
    const createdMs = ulidDecodeTimeSafe(nodeId);
    const createdAt = createdMs ? new Date(createdMs).toISOString() : '';
    if (node.getType() === 'folder') {
      out.push({
        id: nodeId, name, type: 'folder', path: childPath,
        createdAt, parentId: folder.id, bindId,
      });
      await listFolderRecursive(node.asFolder()!, childPath, sinceMs, out, seen);
    } else {
      if (!sinceMs || createdMs >= sinceMs) {
        out.push({
          id: nodeId, name, type: 'file', path: childPath,
          createdAt, parentId: folder.id, bindId,
        });
      }
    }
  }
}

async function findParentAndBind(
  fs: FileSystem,
  targetId: NodeId,
): Promise<{ parent: Folder; bindId: BindId; name: string } | null> {
  const root = await fs.getRoot();
  const visited = new Set<string>();
  async function walk(folder: Folder): Promise<{ parent: Folder; bindId: BindId; name: string } | null> {
    const entries: Entry[] = await folder.list();
    for (const [bindId, name, nodeId] of entries) {
      if (nodeId === targetId) return { parent: folder, bindId, name };
    }
    for (const [, , nodeId] of entries) {
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      const node = await fs.getNode(nodeId);
      if (node?.getType() === 'folder') {
        const r = await walk(node.asFolder()!);
        if (r) return r;
      }
    }
    return null;
  }
  return walk(root);
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

// ── ファイル操作アクション ───────────────────────

async function fsListAction(args: string[]): Promise<unknown> {
  const fs = get(gadgetFileSystem);
  if (!fs) return { error: 'filesystem not available' };
  const path = (args[0] ?? '').trim();
  const since = (args[1] ?? '').trim();
  const sinceMs = since ? Date.parse(since) : 0;

  const folder = await resolveFolder(fs, path);
  if (!folder) return { error: `folder not found: ${path}` };

  const files: FileListItem[] = [];
  await listFolderRecursive(folder, path.replace(/^\/+|\/+$/g, ''), sinceMs, files, new Set());
  return { files };
}

async function openBookAction(args: string[]): Promise<unknown> {
  const id = (args[0] ?? '').trim() as NodeId;
  if (!id) return { error: 'missing file id' };
  const fs = get(gadgetFileSystem);
  if (!fs) return { error: 'filesystem not available' };

  const node = await fs.getNode(id);
  if (!node || node.getType() !== 'file') {
    return { error: `file not found: ${id}` };
  }

  // 親/bindIdを探す (見つからなくても load 自体は進める)
  const found = await findParentAndBind(fs, id);
  if (found) {
    loadToken.set({ fileSystem: fs, nodeId: id, parent: found.parent, bindId: found.bindId });
    // loadToken ハンドラが mainBook を差し替えるまで待機
    const book = await loadBookFrom(fs, node.asFile()!);
    return { id, title: found.name, revisionId: book.revision.id };
  }

  // フォールバック: 直接 mainBook に詰める
  const book = await loadBookFrom(fs, node.asFile()!);
  mainBookFileSystem.set(fs);
  mainBook.set(book);
  mainBookTitle.set(id);
  return { id, title: id, revisionId: book.revision.id };
}

async function fsMkdirAction(args: string[]): Promise<unknown> {
  const path = (args[0] ?? '').trim().replace(/^\/+|\/+$/g, '');
  if (!path) return { error: 'missing path' };
  const fs = get(gadgetFileSystem);
  if (!fs) return { error: 'filesystem not available' };

  await makeFolders(fs, [path]);
  const folder = await resolveFolder(fs, path);
  if (!folder) return { error: `failed to create: ${path}` };
  return { ok: true, path, id: folder.id };
}

async function fsMoveAction(args: string[]): Promise<unknown> {
  const id = (args[0] ?? '').trim() as NodeId;
  const dstPath = (args[1] ?? '').trim();
  if (!id) return { error: 'missing file id' };
  if (!dstPath) return { error: 'missing destination path' };
  const fs = get(gadgetFileSystem);
  if (!fs) return { error: 'filesystem not available' };

  const dst = await resolveFolder(fs, dstPath);
  if (!dst) return { error: `destination folder not found: ${dstPath}` };

  const found = await findParentAndBind(fs, id);
  if (!found) return { error: `file not found: ${id}` };

  // 同一親フォルダ内なら何もしない
  if (found.parent.id === dst.id) {
    return { ok: true, unchanged: true, name: found.name };
  }
  await dst.link(found.name, id);
  await found.parent.unlink(found.bindId);
  return { ok: true, name: found.name, from: found.parent.id, to: dst.id };
}

// ── ページ操作系 ────────────────────────────────

type PageSummary = {
  index: number;
  bubbleCount: number;
  textLength: number;
  filmCount: number;
  frameLeafCount: number;
  empty: boolean;
};

function summarizePages(): PageSummary[] {
  const book = get(mainBook);
  if (!book) return [];
  return book.pages.map((p, index) => {
    const bubbleCount = p.bubbles.length;
    const textLength = p.bubbles.reduce((s, b) => s + (b.text?.length ?? 0), 0);
    const filmStacks = collectImages(p.frameTree);
    const filmCount = filmStacks.reduce((s, fs) => s + fs.films.length, 0);
    const frameLeafCount = collectLeaves(p.frameTree).length;
    const empty = filmCount === 0 && textLength === 0;
    return { index, bubbleCount, textLength, filmCount, frameLeafCount, empty };
  });
}

function getPagesSummaryAction(_args: string[]): unknown {
  const book = get(mainBook);
  if (!book) return { error: 'no mainBook' };
  return { pages: summarizePages() };
}

function deletePageAction(args: string[]): unknown {
  const book = get(mainBook);
  if (!book) return { error: 'no mainBook' };
  const index = Number.parseInt((args[0] ?? '').trim(), 10);
  if (!Number.isInteger(index) || index < 0 || index >= book.pages.length) {
    return { error: `invalid page index: ${args[0]}` };
  }
  book.pages.splice(index, 1);
  commitBook(book, 'page-attribute');
  mainBook.set(book);
  return { ok: true, remaining: book.pages.length };
}

function deleteEmptyPagesAction(_args: string[]): unknown {
  const book = get(mainBook);
  if (!book) return { error: 'no mainBook' };
  const before = book.pages.length;
  const summaries = summarizePages();
  const removeIndices = new Set(summaries.filter(s => s.empty).map(s => s.index));
  book.pages = book.pages.filter((_, i) => !removeIndices.has(i));
  if (book.pages.length === 0) {
    // 0ページは壊れるので最低1ページ残す
    return { ok: false, error: 'would remove all pages; aborted', removed: 0 };
  }
  commitBook(book, 'page-attribute');
  mainBook.set(book);
  return {
    ok: true,
    removed: before - book.pages.length,
    remaining: book.pages.length,
    removedIndices: Array.from(removeIndices),
  };
}

async function mergeFolderAction(args: string[]): Promise<unknown> {
  const path = (args[0] ?? '').trim();
  if (!path) return { error: 'missing folder path' };
  const fs = get(gadgetFileSystem);
  if (!fs) return { error: 'filesystem not available' };

  const folder = await resolveFolder(fs, path);
  if (!folder) return { error: `folder not found: ${path}` };

  const entries = await folder.listEmbodied();
  const fileEntries = entries.filter(([, , n]) => n.getType() === 'file');
  if (fileEntries.length === 0) {
    return { error: 'no files to merge' };
  }

  const allPages: import('../lib/book/book').Page[] = [];
  let direction: import('../lib/book/book').ReadingDirection = 'right-to-left';
  let wrapMode: import('../lib/book/book').WrapMode = 'two-pages';
  const sourceNames: string[] = [];

  for (let i = 0; i < fileEntries.length; i++) {
    const [, name, node] = fileEntries[i];
    const file = node.asFile()!;
    const book = await loadBookFrom(fs, file);
    allPages.push(...book.pages);
    if (i === 0) {
      direction = book.direction;
      wrapMode = book.wrapMode;
    }
    sourceNames.push(name);
  }

  const merged = newBook('not visited', 'add-in-folder-', 'standard', null);
  merged.pages = allPages;
  merged.direction = direction;
  merged.wrapMode = wrapMode;

  const folderName = path.replace(/^\/+|\/+$/g, '').split('/').pop() ?? 'folder';
  const title = `${folderName} - まとめ`;
  const { file } = await newFile(fs, folder, title, merged);

  return {
    ok: true,
    mergedFileId: file.id,
    title,
    mergedFrom: sourceNames,
    totalPages: allPages.length,
  };
}

async function saveBookAction(_args: string[]): Promise<unknown> {
  const book = get(mainBook);
  const fs = get(mainBookFileSystem);
  if (!book || !fs) return { error: 'no mainBook/fileSystem' };
  const node = await fs.getNode(book.revision.id as NodeId);
  if (!node || node.getType() !== 'file') {
    return { error: `book file not found: ${book.revision.id}` };
  }
  await saveBookTo(book, fs, node.asFile()!);
  return { ok: true, revisionId: book.revision.id };
}

function getNotebookAction(_args: string[]): unknown {
  const book = get(mainBook);
  if (!book) return { error: 'no mainBook' };
  const nb = book.notebook;
  return {
    theme: nb.theme ?? '',
    plot: nb.plot ?? '',
    scenario: nb.scenario ?? '',
    characters: nb.characters.map(c => ({
      name: c.name,
      personality: c.personality,
      appearance: c.appearance,
    })),
  };
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
  {
    name: 'fs-list',
    description: 'フォルダを再帰的に列挙 (args: [path, since(ISO)?])',
    args: [
      { type: { tag: 'FreeText', label: 'path' }, required: true },
      { type: { tag: 'FreeText', label: 'since' }, required: false },
    ],
    result: { tag: 'FileList' },
    action: fsListAction,
  },
  {
    name: 'fs-mkdir',
    description: 'フォルダを作成 (階層パス可)',
    args: [{ type: { tag: 'FreeText', label: 'path' }, required: true }],
    result: { tag: 'Generic' },
    action: fsMkdirAction,
  },
  {
    name: 'fs-move',
    description: 'ファイルを別フォルダへ移動 (args: [file-id, dst-path])',
    args: [
      { type: { tag: 'FreeText', label: 'file-id' }, required: true },
      { type: { tag: 'FreeText', label: 'dst-path' }, required: true },
    ],
    result: { tag: 'Generic' },
    action: fsMoveAction,
  },
  {
    name: 'open-book',
    description: 'ファイルIDを指定してmainBookとして開く',
    args: [{ type: { tag: 'FreeText', label: 'file-id' }, required: true }],
    result: { tag: 'Generic' },
    action: openBookAction,
  },
  {
    name: 'get-notebook',
    description: '現在開いているbookのnotebook内容を取得',
    args: [],
    result: { tag: 'Notebook' },
    action: getNotebookAction,
  },
  {
    name: 'get-pages-summary',
    description: '現在開いているbookの各ページの中身の概要を取得',
    args: [],
    result: { tag: 'PagesSummary' },
    action: getPagesSummaryAction,
  },
  {
    name: 'delete-page',
    description: '指定インデックスのページを削除',
    args: [{ type: { tag: 'FreeText', label: 'index' }, required: true }],
    result: { tag: 'Generic' },
    action: deletePageAction,
  },
  {
    name: 'delete-empty-pages',
    description: '中身(film/text)がないページを一括削除',
    args: [],
    result: { tag: 'Generic' },
    action: deleteEmptyPagesAction,
  },
  {
    name: 'save-book',
    description: '現在のmainBookを同期保存',
    args: [],
    result: { tag: 'Generic' },
    action: saveBookAction,
  },
  {
    name: 'merge-folder',
    description: '指定フォルダ内の全bookのページを結合した「まとめ」bookを同じフォルダに作成',
    args: [{ type: { tag: 'FreeText', label: 'path' }, required: true }],
    result: { tag: 'Generic' },
    action: mergeFolderAction,
  },
];
