import type {Folder} from './fileSystem';
import {MockFolder} from './mockFileSystem';

export async function makeSample(): Promise<Folder> {
  const root = new MockFolder('/');
  await root.createFolder('デスクトップ');
  const cabinet = await root.createFolder('キャビネット');
  const comic1 = await cabinet.createFolder('ギャンブルレーサー');
  await comic1.createFile('page1');
  await comic1.createFile('page2');
  await comic1.createFile('page3');
  const comic2 = await cabinet.createFolder('ハンターハンター');
  await comic2.createFile('page1');
  await comic2.createFile('page2');
  const comic3 = await cabinet.createFolder('へうげもの');
  await comic3.createFile('page1');
  const comic4 = await cabinet.createFolder('絶対☆霊域');
  await comic4.createFile('page1');
  await comic4.createFile('page2');
  const comic5 = await cabinet.createFolder('異世界のんびり農家');
  await comic5.createFile('page1');
  await root.createFolder('ごみ箱');
  return root;
}