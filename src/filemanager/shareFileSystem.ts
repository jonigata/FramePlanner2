import { FirebaseFileSystem } from '../lib/filesystem/firebaseFileSystem';

export async function buildShareFileSystem(referenceUserId: string): Promise<FirebaseFileSystem> {
  const fs = new FirebaseFileSystem();
  await fs.openShared(referenceUserId);
  const root = await fs.getRoot();

  const imageFolder = await root.getEntryByName('画像');
  if (!imageFolder) {
    const images = await fs.createFolder();
    await root.link('画像', images.id);
  } else {
    console.log('画像フォルダーはすでに存在します');
  }

  return fs;
}

export async function buildCloudFileSystem(): Promise<FirebaseFileSystem> {
  const fs = new FirebaseFileSystem();
  await fs.openCloud();
  const root = await fs.getRoot();

  const imageFolder = await root.getEntryByName('画像');
  if (!imageFolder) {
    const images = await fs.createFolder();
    await root.link('画像', images.id);
  } else {
    console.log('画像フォルダーはすでに存在します');
  }

  const cabinetFolder = await root.getEntryByName('キャビネット');
  if (!cabinetFolder) {
    const cabinet = await fs.createFolder();
    await root.link('キャビネット', cabinet.id);
  } else {
    console.log('キャビネットフォルダーはすでに存在します');
  }

  return fs;
}
