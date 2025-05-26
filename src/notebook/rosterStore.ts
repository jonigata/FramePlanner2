import { type Writable, writable } from "svelte/store";
import type { CharacterLocal } from '../lib/book/book';
import type { CharacterBase } from "../lib/book/types/notebook";
import { type FileSystem, getNodeByPath, type File } from "../lib/filesystem/fileSystem";
import { canvasToBlob, createCanvasFromBlob } from "../lib/layeredCanvas/tools/imageUtil";
import { buildNullableMedia } from "../lib/layeredCanvas/dataModels/media";

export const rosterOpen: Writable<boolean> = writable(false);
export const rosterSelectedCharacter: Writable<CharacterLocal | null>  = writable(null);

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
    let portrait = null;
    try {
      portrait = c.portrait ? await createCanvasFromBlob(c.portrait) : null;
    }
    catch(e) {
      // 過去のバグの互換性で、空オブジェクトになっていることがある
    }
    characters.push({
      ...c,
      portrait: buildNullableMedia(portrait)
    });
  }
  return characters;
}