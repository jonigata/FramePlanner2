import { type Writable, writable, get } from "svelte/store";
import { gadgetFileSystem } from '../filemanager/fileManagerStore';
import type { CharacterLocal, NotebookLocal } from '../lib/book/book';
import type { CharacterBase } from "../lib/book/types/notebook";
import { type FileSystem, getNodeByPath, type File } from "../lib/filesystem/fileSystem";
import { canvasToBlob, createCanvasFromBlob } from "../lib/layeredCanvas/tools/imageUtil";
import { buildNullableMedia } from "../lib/layeredCanvas/dataModels/media";

export const rosterOpen: Writable<boolean> = writable(false);
export const rosterSelectedCharacter: Writable<CharacterLocal | null>  = writable(null);
export const rosterNamesCache: Writable<string[]> = writable([]);

let rosterNamesFetching = false;
export function prefetchRosterNames(): void {
  if (rosterNamesFetching) return;
  const fs = get(gadgetFileSystem);
  if (!fs) return;
  rosterNamesFetching = true;
  loadCharactersFromRoster(fs).then(chars => {
    rosterNamesCache.set(chars.map(c => c.name).filter(n => n));
  }).catch(() => {}).finally(() => {
    rosterNamesFetching = false;
  });
}

export interface CharacterInRoster extends CharacterBase {
  portrait: Blob | null;
}

export async function saveCharacterToRoster(fs: FileSystem, c: CharacterLocal) {
  const folder = (await getNodeByPath(fs, "AI/キャラクター")).asFolder()!;

  const entry = await folder.getEmbodiedEntryByName(c.ulid);
  let file: File;
  if (entry) {
    file = entry[2].asFile()!;
  } else {
    file = await fs.createFile();
    await folder.link(c.ulid, file.id);
  }

  let portrait = null;
  if (c.portrait && c.portrait !== 'loading') {
    portrait = await canvasToBlob(c.portrait.persistentSource as HTMLCanvasElement);
  }

  const cc: CharacterInRoster = {
    ...c,
    portrait
  };

  console.log(cc);
  await file.write(cc);
}

export async function loadCharactersFromRoster(fs: FileSystem): Promise<CharacterLocal[]> {
  const folder = (await getNodeByPath(fs, "AI/キャラクター")).asFolder();
  const entries = await folder!.listEmbodied();
  const characters = [];
  for (const entry of entries) {
    const c = await entry[2].asFile()!.read() as CharacterInRoster;
    characters.push({
      ...c,
      portrait: buildNullableMedia(null)
    });
  }
  return characters;
}

export async function loadCharacterPortraits(
  fs: FileSystem,
  characters: CharacterLocal[],
  onUpdate: () => void
): Promise<void> {
  const folder = (await getNodeByPath(fs, "AI/キャラクター")).asFolder()!;
  for (const character of characters) {
    const entry = await folder.getEmbodiedEntryByName(character.ulid);
    if (!entry) continue;
    const c = await entry[2].asFile()!.read() as CharacterInRoster;
    if (!c.portrait) continue;
    try {
      const canvas = await createCanvasFromBlob(c.portrait);
      character.portrait = buildNullableMedia(canvas);
      onUpdate();
    } catch(e) {
      // 過去のバグの互換性で、空オブジェクトになっていることがある
    }
  }
}

/**
 * 名前指定でRosterからキャラクターを取得してnotebookに追加する。
 * ポートレートも非同期でロードする。
 * @returns 追加されたキャラクター、または失敗時はnull
 */
export async function hireCharacterByName(
  fs: FileSystem,
  notebook: NotebookLocal,
  name: string,
  onUpdate: () => void,
): Promise<CharacterLocal | null> {
  const { ulid } = await import('ulid');
  const rosterCharacters = await loadCharactersFromRoster(fs);
  const found = rosterCharacters.find(c => c.name === name);
  if (!found) return null;

  found.ulid = ulid();
  notebook.characters.push(found);
  loadCharacterPortraits(fs, [found], onUpdate);
  return found;
}

/**
 * ファイルシステム上の順序を移動（oldIndex -> newIndex）。
 * 名前(ulid)やファイルIDはそのまま、bindIdのみ再発行されます。
 */
export async function reorderRoster(fs: FileSystem, oldIndex: number, newIndex: number): Promise<void> {
  const folder = (await getNodeByPath(fs, "AI/キャラクター")).asFolder()!;
  const entries = await folder.list();
  if (oldIndex < 0 || oldIndex >= entries.length) return;
  if (newIndex < 0 || newIndex >= entries.length) newIndex = entries.length - 1;

  const [bindId, name, nodeId] = entries[oldIndex];
  // いったん削除
  await folder.unlink(bindId);
  // 削除によってインデックスが1つ詰まるので調整
  const adjustedNewIndex = newIndex > oldIndex ? newIndex - 1 : newIndex;
  // 同じ名前（ulid）で希望位置に再挿入
  await folder.insert(name, nodeId, adjustedNewIndex);
}
