import { writable, get, type Writable } from "svelte/store";
import type { FileSystem, Folder, File, NodeId, BindId } from "../lib/filesystem/fileSystem.js";
import type { Page, Book, SerializedBook, SerializedPage, SerializedCharacter, SerializedNotebook } from "../lib/book/book";
import { commitBook, emptyNotebook } from "../lib/book/book";
import { FrameElement } from "../lib/layeredCanvas/dataModels/frameTree";
import { Bubble } from "../lib/layeredCanvas/dataModels/bubble";
import { ulid } from 'ulid';
import type { Vector } from "../lib/layeredCanvas/tools/geometry/geometry";
import { protocolChatLogToRichChatLog, richChatLogToProtocolChatLog } from "$bookTypes/richChat";
import { storeFrameImages, storeBubbleImages, storeNotebookImages, fetchFrameImages, fetchBubbleImages, fetchNotebookImages } from "./fileImages";
import { writeEnvelope, readEnvelope } from "../lib/book/envelope";
import { writeHierarchicalEnvelopeZip, readHierarchicalEnvelopeZip, type HierarchyNode } from "../lib/book/envelopeZip";
import { dryUnpackBubbleMedias, dryUnpackFrameMedias, dryUnpackNotebookMedias } from "../lib/book/imagePacking";
import type { Media } from "../lib/layeredCanvas/dataModels/media";

export type DraggingEntry = {
  bindId: BindId;
  parent: NodeId;
}

export type Dragging = {
  fileSystem: FileSystem;
  entries: DraggingEntry[];
}

export type LoadToken = {
  fileSystem: FileSystem;
  nodeId: NodeId;
  parent: Folder;
  bindId: BindId;
}

export const fileManagerOpen = writable(false);
export const fileManagerDragging: Writable<Dragging | null> = writable(null);
export const newBookToken: Writable<Book | null> = writable(null);
export const saveBubbleToken: Writable<Bubble | null> = writable(null);
export type FrameLayoutTemplateData = {
  displayName: string;
  frameTree: any; // FrameElement.decompile出力
  bubbles: any[]; // Bubble.decompile出力配列
};
export const saveFrameLayoutToken: Writable<FrameLayoutTemplateData | null> = writable(null);
export const fileManagerUsedSizeToken: Writable<FileSystem | null> = writable(null);
export const loadToken: Writable<LoadToken | null> = writable(null);
export const fileManagerMarkedFlag = writable(false);
export const mainBookFileSystem: Writable<FileSystem | null> = writable(null);
export const gadgetFileSystem: Writable<FileSystem | null> = writable(null);
export const selectedEntries: Writable<Set<NodeId>> = writable(new Set());
export const lastSelectedEntry: Writable<NodeId | null> = writable(null);

// フォルダの開閉状態を永続化するMap（Drawer再描画でも維持される）
export const folderCollapsedState = new Map<NodeId, boolean>();

export function selectEntry(nodeId: NodeId): void {
  selectedEntries.update(s => { s.clear(); s.add(nodeId); return s; });
  lastSelectedEntry.set(nodeId);
}

export function ctrlSelectEntry(nodeId: NodeId): void {
  selectedEntries.update(s => {
    if (s.has(nodeId)) { s.delete(nodeId); } else { s.add(nodeId); }
    return s;
  });
  lastSelectedEntry.set(nodeId);
}

export function shiftSelectEntries(nodeId: NodeId): void {
  const last = get(lastSelectedEntry);
  if (last == null) { selectEntry(nodeId); return; }
  const elements = document.querySelectorAll<HTMLElement>('[data-node-id]');
  const ids = Array.from(elements).map(el => el.dataset.nodeId as NodeId);
  const fromIdx = ids.indexOf(last);
  const toIdx = ids.indexOf(nodeId);
  if (fromIdx === -1 || toIdx === -1) { selectEntry(nodeId); return; }
  const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
  const range = ids.slice(start, end + 1);
  selectedEntries.update(s => { s.clear(); for (const id of range) { s.add(id); } return s; });
  // lastSelectedEntry is not updated on shift+click
}

export function buildDragging(fileSystem: FileSystem, nodeId: NodeId, bindId: BindId, parentId: NodeId): Dragging {
  const selected = get(selectedEntries);
  if (selected.has(nodeId) && selected.size > 1) {
    // ドラッグ元が選択中 → 全選択エントリをまとめる
    const entries: DraggingEntry[] = [];
    const elements = document.querySelectorAll<HTMLElement>('[data-node-id]');
    for (const el of elements) {
      const nid = el.dataset.nodeId as NodeId;
      if (selected.has(nid)) {
        const bid = el.dataset.bindId as BindId;
        const pid = el.dataset.parentId as NodeId;
        if (bid && pid) {
          entries.push({ bindId: bid, parent: pid });
        }
      }
    }
    return { fileSystem, entries };
  }
  // ドラッグ元が未選択 or 単一選択 → そのエントリだけ
  return { fileSystem, entries: [{ bindId, parent: parentId }] };
}

export async function removeSelectedEntries(fileSystem: FileSystem, trash: Folder): Promise<void> {
  const selected = get(selectedEntries);
  if (selected.size === 0) { return; }
  const elements = document.querySelectorAll<HTMLElement>('[data-node-id]');
  for (const el of elements) {
    const nid = el.dataset.nodeId as NodeId;
    if (!selected.has(nid)) { continue; }
    const bid = el.dataset.bindId as BindId;
    const pid = el.dataset.parentId as NodeId;
    if (!bid || !pid) { continue; }
    const parentFolder = (await fileSystem.getNode(pid)) as Folder;
    const entry = await parentFolder.getEntry(bid);
    if (!entry) { continue; }
    await trash.link(entry[1], entry[2]);
    await parentFolder.unlink(bid);
  }
  selectedEntries.update(s => { s.clear(); return s; });
  lastSelectedEntry.set(null);
}

export type BulkRenameResult = {
  baseName: string;
  separator: string;
  digits: number;
  startNumber: number;
} | null;

export async function renameSelectedEntries(fileSystem: FileSystem, dialogResult: BulkRenameResult): Promise<void> {
  if (!dialogResult) { return; }
  const { baseName, separator, digits, startNumber } = dialogResult;
  const selected = get(selectedEntries);
  if (selected.size < 2) { return; }
  const elements = document.querySelectorAll<HTMLElement>('[data-node-id]');
  let seq = startNumber;
  for (const el of elements) {
    const nid = el.dataset.nodeId as NodeId;
    if (!selected.has(nid)) { continue; }
    const bid = el.dataset.bindId as BindId;
    const pid = el.dataset.parentId as NodeId;
    if (!bid || !pid) { continue; }
    const parentFolder = (await fileSystem.getNode(pid)) as Folder;
    const padded = String(seq).padStart(digits, '0');
    await parentFolder.rename(bid, `${baseName}${separator}${padded}`);
    seq++;
  }
}

export async function exportSelectedEntries(
  fileSystem: FileSystem,
  progress: (n: number) => void
): Promise<Blob | null> {
  const selected = get(selectedEntries);
  if (selected.size === 0) { return null; }
  const nodes: HierarchyNode[] = [];
  const elements = document.querySelectorAll<HTMLElement>('[data-node-id]');
  for (const el of elements) {
    const nid = el.dataset.nodeId as NodeId;
    if (!selected.has(nid)) { continue; }
    const bid = el.dataset.bindId as BindId;
    const pid = el.dataset.parentId as NodeId;
    if (!bid || !pid) { continue; }
    const parentFolder = (await fileSystem.getNode(pid)) as Folder;
    const entry = await parentFolder.getEntry(bid);
    if (!entry) { continue; }
    const [, name, nodeId] = entry;
    const node = await fileSystem.getNode(nodeId);
    if (!node) { continue; }
    if (node.getType() === 'folder') {
      const childNode = await createHierarchyFromFolder(fileSystem, node.asFolder()!, name);
      nodes.push(childNode);
    } else {
      try {
        const book = await loadBookFrom(fileSystem, node.asFile()!);
        nodes.push({ name, book, isFolder: false });
      } catch (error) {
        console.error(`Failed to load book from ${name}:`, error);
      }
    }
  }
  if (nodes.length === 0) { return null; }
  return await writeHierarchicalEnvelopeZip(nodes, progress);
}

export function clearSelection(): void {
  selectedEntries.update(s => { s.clear(); return s; });
  lastSelectedEntry.set(null);
}

export function handleEntryClick(nodeId: NodeId, e: MouseEvent): void {
  if (e.ctrlKey || e.metaKey) {
    ctrlSelectEntry(nodeId);
  } else if (e.shiftKey) {
    shiftSelectEntries(nodeId);
  } else {
    selectEntry(nodeId);
  }
}

export async function saveBookTo(book: Book, fileSystem: FileSystem, file: File): Promise<void> {
  const startTime = performance.now();
  console.tag("saveBookTo", "cyan", file.id);

  const root = await fileSystem.getRoot();
  const imageFolder = (await root.getNodesByName('画像'))[0] as Folder;
  const videoFolder = (await root.getNodesByName('動画'))[0] as Folder;

  const notebook = await storeNotebookImages(book.notebook, fileSystem, imageFolder, videoFolder);

  const serializedBook: SerializedBook = {
    revision: book.revision,
    pages: [],
    direction: book.direction,
    wrapMode: book.wrapMode,
    chatLogs: richChatLogToProtocolChatLog(book.chatLogs),
    notebook: notebook,
    attributes: book.attributes,
    newPageProperty: book.newPageProperty,
  };

  for (const page of book.pages) {
    const markUp = await storeFrameImages(page.frameTree, fileSystem, imageFolder, videoFolder, 'v');
    const bubbles = await storeBubbleImages(page.bubbles, fileSystem, imageFolder, videoFolder, page.paperSize);
    
    const serializedPage: SerializedPage = {
      id: page.id,
      frameTree: markUp,
      bubbles: bubbles,
      paperSize: page.paperSize,
      paperColor: page.paperColor,
      frameColor: page.frameColor,
      frameWidth: page.frameWidth,
      fontSizeCoefficient: page.fontSizeCoefficient,
    }
    serializedBook.pages.push(serializedPage);    
  }

  const json = JSON.stringify(serializedBook);
  await file.write(json);
  
  const endTime = performance.now();
  console.log(`saveBookTo completed in ${(endTime - startTime).toFixed(2)}ms`);
}

export function serializeBook(book: Book): SerializedBook {
  return {
    revision: book.revision,
    pages: book.pages.map(page => serializePage(page)),
    direction: book.direction,
    wrapMode: book.wrapMode,
    chatLogs: richChatLogToProtocolChatLog(book.chatLogs),
    notebook: {
      ...book.notebook,
      characters: book.notebook.characters.map(character => {
        return { ...character, portrait: null } as SerializedCharacter;
      })
    } as SerializedNotebook,
    attributes: book.attributes,
    newPageProperty: book.newPageProperty,
  }
}

function serializePage(page: Page): SerializedPage {
  return {
    id: page.id,
    frameTree: FrameElement.decompileNode(page.frameTree, 'v'),
    bubbles: page.bubbles.map(bubble => Bubble.decompile(bubble)),
    paperSize: page.paperSize,
    paperColor: page.paperColor,
    frameColor: page.frameColor,
    frameWidth: page.frameWidth,
    fontSizeCoefficient: page.fontSizeCoefficient,
  }
}

export async function loadBookFrom(fileSystem: FileSystem, file: File): Promise<Book> {
  console.tag("loadBookFrom", "cyan", file.id);
  performance.mark("loadBookFrom-start");
  const content = await file.read();
  if (content === undefined || content === null) {
    throw new Error(`File content is ${content} for file ${file.id}`);
  }
  const serializedBook: SerializedBook = JSON.parse(content);

  // マイグレーションとして、BookではなくPageのみを保存している場合がある
  if (!serializedBook.pages) {
    const serializedPage = serializedBook as any as SerializedPage;
    const frameTree = await fetchFrameImages(serializedPage.paperSize, serializedPage.frameTree, fileSystem);
    const bubbles = await fetchBubbleImages(serializedPage.paperSize, serializedPage.bubbles, fileSystem);
    return await wrapPageAsBook(serializedBook, frameTree, bubbles);
  }

  const chatLogs = protocolChatLogToRichChatLog(serializedBook.chatLogs ?? []);

  const notebook =
    serializedBook.notebook
    ? await fetchNotebookImages(serializedBook.notebook, fileSystem)
    : emptyNotebook(null);

  if (!serializedBook.newPageProperty) {
    const p = serializedBook.pages[0];
    serializedBook.newPageProperty = {
      paperSize: [...p.paperSize],
      paperColor: p.paperColor,
      frameColor: p.frameColor,
      frameWidth: p.frameWidth,
      templateName: "standard",
    }
  }
  const defaultAttributes = {
    publishUrl: null as string | null,
    showVideoPlayButton: true,
    showVideoDottedBorder: true,
  };

  const mergedAttributes = {
    ...defaultAttributes,
    ...(serializedBook.attributes ?? {}),
  };

  const book: Book = {
    revision: serializedBook.revision,
    pages: [],
    history: {
      entries: [],
      cursor: 0,
    },
    direction: serializedBook.direction ?? 'right-to-left',
    wrapMode: serializedBook.wrapMode ?? 'none',
    chatLogs,
    notebook: notebook,
    attributes: mergedAttributes,
    newPageProperty: serializedBook.newPageProperty
  };

  performance.mark("loadBookFrom-images-start");
  for (const serializedPage of serializedBook.pages) {
    const frameTree = await fetchFrameImages(serializedPage.paperSize, serializedPage.frameTree, fileSystem);
    const bubbles = await fetchBubbleImages(serializedPage.paperSize, serializedPage.bubbles, fileSystem);

    const page: Page = {
      id: serializedPage.id ?? ulid(),
      frameTree: frameTree,
      bubbles: bubbles,
      paperSize: serializedPage.paperSize,
      paperColor: serializedPage.paperColor,
      frameColor: serializedPage.frameColor,
      frameWidth: serializedPage.frameWidth,
      fontSizeCoefficient: serializedPage.fontSizeCoefficient ?? 1.0,
      source: null,
    };
    book.pages.push(page);
  }
  performance.mark("loadBookFrom-images-end");
  performance.measure("loadBookFrom-images", "loadBookFrom-images-start", "loadBookFrom-images-end");
  commitBook(book, null);

  performance.mark("loadBookFrom-end");
  performance.measure("loadBookFrom", "loadBookFrom-start", "loadBookFrom-end");

  return book;
}

async function wrapPageAsBook(serializedPage: any, frameTree: FrameElement, bubbles: Bubble[]): Promise<Book> {
  const page: Page = {
    id: serializedPage.id ?? ulid(),
    frameTree: frameTree,
    bubbles: bubbles,
    paperSize: serializedPage.paperSize,
    paperColor: serializedPage.paperColor,
    frameColor: serializedPage.frameColor,
    frameWidth: serializedPage.frameWidth,
    fontSizeCoefficient: serializedPage.fontSizeCoefficient ?? 1.0,
    source: null,
  };

  const book: Book = {
    revision: serializedPage.revision,
    pages: [page],
    history: {
      entries: [],
      cursor: 0,
    },
    direction: 'right-to-left',
    wrapMode: 'none',
    chatLogs: [],
    notebook: emptyNotebook(null),
    attributes: { publishUrl: null, showVideoPlayButton: true, showVideoDottedBorder: true },
    newPageProperty: {
      paperSize: [840, 1188],
      paperColor: "#FFFFFF",
      frameColor: "#000000",
      frameWidth: 2,
      templateName: "standard",
    },
  };
  commitBook(book, null);

  return book;
}

export async function newFile(fs: FileSystem, folder: Folder, name: string, book: Book): Promise<{file: File, bindId: BindId}> {
  const file = await fs.createFile();
  book.revision.id = file.id;

  console.tag("newFile", "cyan");
  await saveBookTo(book, fs, file);
  const bindId = await folder.link(name, file.id);
  return { file, bindId };
}

export function getCurrentDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');  // 月は0から始まるため+1します
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}  

export async function saveBubbleTo(bubble: Bubble, file: File) {
  const markUp = Bubble.decompile(bubble);
  const json = JSON.stringify(markUp);
  await file.write(json);
}

// 歴史的事情により、古いバージョンから読み込むときはpaperSizeを指定する必要がある
export async function loadBubbleFrom(paperSize: Vector, file: File): Promise<Bubble> {
  const content = await file.read();
  const markUp = JSON.parse(content);
  const bubble = Bubble.compile(paperSize, markUp);
  return bubble;
}

export async function saveFrameLayoutTo(data: FrameLayoutTemplateData, file: File) {
  await file.write(JSON.stringify(data));
}

export async function loadFrameLayoutFrom(file: File): Promise<FrameLayoutTemplateData> {
  const content = await file.read();
  return JSON.parse(content) as FrameLayoutTemplateData;
}

export async function dryLoadBookFrom(fileSystem: FileSystem, file: File, images: NodeId[]) { // ガベコレの調査用
  const content = await file.read();
  let serializedBook = JSON.parse(content);

  // マイグレーションとして、BookではなくPageのみを保存している場合がある
  if (!serializedBook.pages) {
    serializedBook = {
      pages: [serializedBook],
    }
  }

  for (const serializedPage of serializedBook.pages) {
    await dryUnpackFrameMedias(serializedPage.paperSize, serializedPage.frameTree, images);
    await dryUnpackBubbleMedias(serializedPage.paperSize, serializedPage.bubbles, images);
    if (serializedBook.notebook) {
      await dryUnpackNotebookMedias(serializedBook.notebook, images);
    }
  }
}

export async function saveMaterial(fileSystem: FileSystem, media: Media): Promise<BindId> {
  const root = await fileSystem.getRoot();
  const materialFolder = (await root.getNodesByName('素材'))[0] as Folder;
  return await saveMaterialToFolder(materialFolder, media);
}

export async function saveMaterialToFolder(folder: Folder, media: Media, fileName?: string): Promise<BindId> {
  const file = await folder.fileSystem.createFile();
  await file.writeMediaResource(media.persistentSource);
  const name = fileName || file.id;
  return await folder.link(name, file.id);
}

export async function deleteMaterial(fileSystem: FileSystem, materialBindId: BindId): Promise<void> {
  const root = await fileSystem.getRoot();
  const materialFolder = (await root.getNodesByName('素材'))[0] as Folder;
  await deleteMaterialFromFolder(materialFolder, materialBindId);
}

export async function deleteMaterialFromFolder(folder: Folder, materialBindId: BindId): Promise<void> {
  const nodeId = (await folder.getEntry(materialBindId))![2];
  await folder.unlink(materialBindId);
  await folder.fileSystem.destroyNode(nodeId);
}

export async function copyBookOrFolderInterFileSystem(sourceFileSystem: FileSystem, targetFileSystem: FileSystem, sourceNodeId: NodeId): Promise<NodeId> {
  let nodeId: NodeId | null = null;
  await targetFileSystem.withoutPersist(async () => {
    nodeId = await copyBookOrFolderInterFileSystemInternal(sourceFileSystem, targetFileSystem, sourceNodeId, {});
  });
  return nodeId!;
}

async function copyBookOrFolderInterFileSystemInternal(sourceFileSystem: FileSystem, targetFileSystem: FileSystem, sourceNodeId: NodeId, copied: { [NodeId: string]: NodeId }): Promise<NodeId> {
  if (copied[sourceNodeId]) {
    return copied[sourceNodeId];
  }

  const sourceNode = (await sourceFileSystem.getNode(sourceNodeId))!;
  const sourceFolder = sourceNode.asFolder();
  if (sourceFolder) {
    const targetFolder = await targetFileSystem.createFolder();
    copied[sourceNodeId] = targetFolder.id;

    const entries = await sourceFolder.list();
    for (const entry of entries) {
      const sourceChildNodeId = entry[2];
      const targetChildNodeId = await copyBookOrFolderInterFileSystemInternal(sourceFileSystem, targetFileSystem, sourceChildNodeId, copied);
      await targetFolder.link(entry[1], targetChildNodeId);
    }
    return targetFolder.id;
  } else {
    // file is book
    async function justCopy() {
      const sourceFile = sourceNode.asFile()!;
      const book = await loadBookFrom(sourceFileSystem, sourceFile);
  
      const targetFile = await targetFileSystem.createFile('text');
      book.revision.id = targetFile.id;
      await saveBookTo(book, targetFileSystem, targetFile);
      return targetFile.id;
    }

    if (sourceFileSystem.isVault) {
      if (targetFileSystem.isVault) {
        // Vault -> Vault
        console.log("================ Vault -> Vault");
        return await justCopy();
      } else {
        // Vault -> Local
        console.log("================ Vault -> Local");
        const sourceFile = sourceNode.asFile()!;
        const blob = await sourceFile.readBlob();
        const targetFile = await targetFileSystem.createFile();
        const importedBook = await readEnvelope(blob, n => {});
        importedBook.revision.id = targetFile.id;
        saveBookTo(importedBook, targetFileSystem, targetFile);
        return targetFile.id;
      }
    } else {
      if (targetFileSystem.isVault) {
        // Local -> Vault
        console.log("================ Local -> Vault");
        const sourceFile = sourceNode.asFile()!;
        const book = await loadBookFrom(sourceFileSystem, sourceFile);
        const blob = await writeEnvelope(book, n => {});
        const targetFile = await targetFileSystem.createFile();
        await targetFile.writeBlob(blob);
        return targetFile.id;
      } else {
        // Local -> Local        
        console.log("================ Local -> Local");
        return await justCopy();
      }
    }
  }
}

/**
 * フォルダの階層構造を再帰的に取得して、HierarchyNode形式に変換する
 * @param fileSystem ファイルシステム
 * @param folder 対象フォルダ
 * @param folderName フォルダ名
 * @returns HierarchyNode
 */
export async function createHierarchyFromFolder(
  fileSystem: FileSystem,
  folder: Folder,
  folderName: string
): Promise<HierarchyNode> {
  const entries = await folder.listEmbodied();
  const rootNode: HierarchyNode = {
    name: folderName,
    isFolder: true,
    children: []
  };
  
  for (const [bindId, name, node] of entries) {
    if (node.getType() === 'folder') {
      // フォルダの場合は再帰的に処理
      const childFolder = node.asFolder()!;
      const childNode = await createHierarchyFromFolder(fileSystem, childFolder, name);
      rootNode.children!.push(childNode);
    } else {
      // ファイルの場合はBookとして処理
      try {
        const file = node.asFile()!;
        const book = await loadBookFrom(fileSystem, file);
        rootNode.children!.push({
          name,
          book,
          isFolder: false
        });
      } catch (error) {
        console.error(`Failed to load book from ${name}:`, error);
      }
    }
  }
  
  return rootNode;
}

/**
 * フォルダのコンテンツをZIPファイルとしてエクスポートする
 * @param fileSystem ファイルシステム
 * @param folder 対象フォルダ
 * @param folderName フォルダ名
 * @param progress 進捗コールバック
 * @returns ZIPファイルのBlobオブジェクト
 */
export async function exportFolderAsEnvelopeZip(
  fileSystem: FileSystem,
  folder: Folder,
  folderName: string,
  progress: (n: number) => void = () => {}
): Promise<Blob> {
  const hierarchy = await createHierarchyFromFolder(fileSystem, folder, folderName);
  return await writeHierarchicalEnvelopeZip([hierarchy], progress);
}

/**
 * 階層構造をファイルシステムに保存する
 * @param fileSystem ファイルシステム
 * @param parentFolder 親フォルダ
 * @param node 階層構造ノード
 * @param progress 進捗コールバック
 */
export async function saveHierarchyToFolder(
  fileSystem: FileSystem,
  parentFolder: Folder,
  nodes: HierarchyNode[],
  progress: (n: number) => void = () => {}
): Promise<void> {
  let total = 0;
  let current = 0;

  function countAllNodes(n: HierarchyNode): number {
    let count = 1;
    if (n.children) {
      for (const child of n.children) {
        count += countAllNodes(child);
      }
    }
    return count;
  }

  for (const node of nodes) { total += countAllNodes(node); }
  
  // 再帰的に保存
  async function saveNodeToFolder(folder: Folder, node: HierarchyNode): Promise<void> {
    if (node.isFolder) {
      const newFolder = await fileSystem.createFolder();
      await folder.link(node.name, newFolder.id);

      if (node.children) {
        for (const child of node.children) {
          await saveNodeToFolder(newFolder, child);
        }
      }
    } else if (node.book) {
      // ファイルの場合はBookを保存
      const file = await fileSystem.createFile();
      node.book.revision.id = file.id;
      await saveBookTo(node.book, fileSystem, file);
      await folder.link(node.name, file.id);
    }
    
    // 進捗を更新
    current++;
    progress(current / total);
  }
  
  for (const node of nodes) {
    await saveNodeToFolder(parentFolder, node);
  }
}

/**
 * ZIPファイルから階層構造をインポートしてフォルダに保存する
 * @param fileSystem ファイルシステム
 * @param folder 保存先フォルダ
 * @param zipBlob ZIPファイルのBlob
 * @param progress 進捗コールバック
 */
export async function importEnvelopeZipToFolder(
  fileSystem: FileSystem,
  folder: Folder,
  zipBlob: Blob,
  progress: (n: number) => void = () => {}
): Promise<void> {
  // 進捗の2段階表示用
  const phaseProgress = (phase: number, value: number) => {
    progress(phase * 0.5 + value * 0.5);
  };
  
  // ZIPから階層構造を読み込む
  const hierarchy = await readHierarchicalEnvelopeZip(zipBlob,
    (value) => phaseProgress(0, value)
  );
  
  // 階層構造をフォルダに保存
  await saveHierarchyToFolder(fileSystem, folder, hierarchy,
    (value) => phaseProgress(1, value)
  );
}
