import type { FileSystem, NodeId, File } from './lib/filesystem/fileSystem';

export async function recordCurrentFileId(fileSystem: FileSystem, id: NodeId) {
  const root = await fileSystem.getRoot();
  const preference = await root.getNodeByName("プリファレンス");
  const entry = await preference.asFolder().getEmbodiedEntryByName("currentFile");
  if (entry) {
    await (entry[2] as File).write(id);
  } else {
    const file = await fileSystem.createFile();
    await preference.asFolder().link("currentFile", file.id);
    await file.write(id);
  }
}

export async function fetchCurrentFileId(fileSystem: FileSystem): Promise<NodeId> {
  const root = await fileSystem.getRoot();
  const preference = await root.getNodeByName("プリファレンス");
  const entry = await preference.asFolder().getEmbodiedEntryByName("currentFile");
  if (entry) {
    const id = await (entry[2] as File).read();
    return id as NodeId;
  } else {
    return null;
  }
}
