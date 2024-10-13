import type { FileSystem, NodeId, Folder } from '../lib/filesystem/fileSystem';
import { dryLoadBookFrom } from "../filemanager/fileManagerStore";

export async function collectGarbage(fileSystem: FileSystem): Promise<{ usedImageFiles: NodeId[], strayImageFiles: NodeId[] }> {
  const root = await fileSystem.getRoot();
  const desktop = (await root.getEmbodiedEntryByName("デスクトップ"))!;
  const cabinet = (await root.getEmbodiedEntryByName("キャビネット"))!;
  const trash = (await root.getEmbodiedEntryByName("ごみ箱"))!;

  const allFiles: string[] = [];
  const allFolders: string[] = [];
  await listFiles(desktop[2].asFolder(), allFiles, allFolders);
  await listFiles(cabinet[2].asFolder(), allFiles, allFolders);
  await listFiles(trash[2].asFolder(), allFiles, allFolders);

  const usedImageFiles: NodeId[] = [];
  for (const file of allFiles) {
    console.log("fileId", file);
    await dryLoadBookFrom(fileSystem, (await fileSystem.getNode(file as NodeId))!.asFile(), usedImageFiles);
  }

  const materialImageFolder = (await root.getNodeByName("素材"))!;
  const materialImages = (await materialImageFolder.asFolder().list()).map((entry) => entry[2]);
  usedImageFiles.push(...materialImages);

  const allImageFolder = (await root.getNodeByName("画像"))!;
  const allImageFiles = (await allImageFolder.asFolder().list()).map((entry) => entry[2]);
  allImageFiles.push(...materialImages);

  function difference(setA: Set<NodeId>, setB: Set<NodeId>) {
    const _difference = new Set(setA);
    for (const elem of setB) {
      _difference.delete(elem);
    }
    return _difference;
  }

  const usedImageSet = new Set(usedImageFiles);
  const allImageSet = new Set(allImageFiles);
  const strayImageFiles = Array.from(difference(allImageSet, usedImageSet)) as NodeId[];
  
  console.log("usedImages", usedImageFiles.length);
  console.log("strayImages", strayImageFiles.length);

  console.log("garbage collection done");
  return { usedImageFiles, strayImageFiles };
}

export async function purgeCollectedGarbage(fileSystem: FileSystem, imageFolder: Folder, strayImageFiles: string[]) {
  const imageList = await imageFolder.list();
  // sort & uniq
  const uniqList = [...new Set(imageList.map((entry) => entry[2]))];
  console.log("imageList", imageList.length, "uniqList", uniqList.length);

  for (const imageFile of strayImageFiles) {
    /*
    const file = (await fileSystem.getNode(imageFile as NodeId)).asFile();
    const image = await file.readImage();
    await drawStrayMark(image);
    await file.writeImage(image);
    */
    await fileSystem.destroyNode(imageFile as NodeId);
    const bindIds = imageList.filter((entry) => entry[2] === imageFile).map(e => e[0]);
    await imageFolder.unlinkv(bindIds);
    console.log("purge image", imageFile);
  }
  console.log("purge done");
}

async function drawStrayMark(image: HTMLImageElement) {
  await image.decode();

  // 大きなバツ印を描く
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0, image.width, image.height);
  ctx.strokeStyle = "green";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(image.width, image.height);
  ctx.moveTo(0, image.height);
  ctx.lineTo(image.width, 0);
  ctx.stroke();
  image.src = canvas.toDataURL("image/png");
  await image.decode();
}

async function listFiles(folder: Folder, files: string[], folders: string[]) {
  const entries = await folder.listEmbodied();

  const destroyed = [];
  for (const entry of entries) {
    if (entry[2] == null) { 
      // フォルダにエントリがあるが実体がない場合
      // 本来ここに来るべきではないが、プログラムのミスでここに来ることがある
      console.tag("FileSystem inconsistency", "red", entry[0]);
      destroyed.push(entry[0]);
      continue; 
    }
    if (entry[2].getType() === 'folder') {
      folders.push(entry[2].id);
      await listFiles(entry[2].asFolder(), files, folders);
    } else {
      files.push(entry[2].id);
    }
  }

  // 矛盾の解決
  for (const id of destroyed) {
    console.log("unlink inconsistency", id, "in", folder.id)
    await folder.unlink(id);
  }
}
