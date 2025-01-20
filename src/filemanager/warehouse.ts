import type { FileSystem } from "../lib/filesystem/fileSystem";

export interface RemoteRequest {
  type: "request";
  createdAt: string;
  mediaType: "image" | "video";
  mode: string;
  requestId: string;
}

export interface RemoteEntity {
  type: "entity";
  createdAt: string;
  mediaType: "image" | "video";
  mode: string;
  requestId: string;
  mediaUrls: string[];
}

export type RemoteEntry = RemoteEntity | RemoteRequest;

export async function saveRequest(fileSystem: FileSystem, mediaType: "image" | "video", mode: string, requestId: string) {
  const root = await fileSystem.getRoot();
  const warehouse = (await root.getNodeByName("倉庫"))!.asFolder()!;

  const file = await fileSystem.createFile();
  file.write({
    type: "request", 
    createdAt: new Date().toISOString(),
    mediaType,
    mode,
    requestId, 
  });

  await warehouse.link(requestId, file.id);
}

export async function saveEntity(fileSystem: FileSystem, mediaType: "image" | "video", mode: string, requestId: string, mediaUrls: string[]) {
  const root = await fileSystem.getRoot();
  const warehouse = (await root.getNodeByName("倉庫"))!.asFolder()!;

  const file = (await warehouse.getEmbodiedEntryByName(requestId))![2].asFile()!;
  file.write({
    type: "entity", 
    createdAt: new Date().toISOString(),
    mediaType,
    mode,
    requestId,
    mediaUrls,
  });
}

export async function deleteEntry(fileSystem: FileSystem, requestId: string) {
  console.log("deleting", requestId);
  const root = await fileSystem.getRoot();
  const warehouse = (await root.getNodeByName("倉庫"))!.asFolder()!;
  const e = (await warehouse.getEntryByName(requestId));
  if (!e) {
    console.log("entry not found", requestId);
    return;
  }
  await warehouse.unlink(e[0]);
  fileSystem.destroyNode(e[2]);
}

export async function getEntries(fileSystem: FileSystem): Promise<RemoteEntry[]> {
  const root = await fileSystem.getRoot();
  const warehouse = (await root.getNodeByName("倉庫"))!.asFolder()!;

  const files = (await warehouse.listEmbodied());
  const expireLimit = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 3);

  const entries: RemoteEntry[] = [];
  for (const file of files) {
    const entry = (await file[2].asFile()!.read()) as RemoteEntry;
    // 3ヶ月以上前ならスキップ
    if (new Date(entry.createdAt) < expireLimit) {
      await warehouse.unlink(file[0]);
      fileSystem.destroyNode(file[2].id);
      continue;
    }
    entries.push(entry);
  }

  return entries;
}
