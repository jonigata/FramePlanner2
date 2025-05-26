import { describe, it, expect } from "vitest"
import type { NodeId, Folder } from "../../lib/filesystem/fileSystem";
import { promises as fs } from 'fs';
import { MockFileSystem } from "../../lib/filesystem/mockFileSystem";
import { collectGarbage, purgeCollectedGarbage } from "../../utils/garbageCollection";

// NOTICE:
// TypeA～Cをそれぞれ削除するテストを用意しているが、
// 主題は「残ったファイルが正しいか」である

console.tag = function(tag, color, ...args) {
  console.log(`%c${tag}`, `color:white; background-color:${color}; padding:2px 4px; border-radius:4px;`, ...args);
  // console.trace();
}

async function destroyAndUnlink(fileSystem: MockFileSystem, nodeId: NodeId, folder: Folder) {
  await fileSystem.destroyNode(nodeId);
  await folder.unlink((await folder.getBindId(nodeId))!);
}

describe('ガベージコレクション', () => {
  it('dump/undump(空)', async () => {
    const fileSystem = new MockFileSystem();
    const source = '[]';
    fileSystem.undumpFromString(source);
    const target = fileSystem.dumpToString();
    expect(JSON.parse(target)).toEqual(JSON.parse(source));
  });
  it('dump/undump(単純なファイル)', async () => {
    const fileSystem = new MockFileSystem();
    const source = `[{
      "id": "01HR78PS394VGSBNNH30CZX2HC",
      "type": "file",
      "content": "dummy"
    }]`;
    fileSystem.undumpFromString(source);
    const target = fileSystem.dumpToString();
    expect(JSON.parse(target)).toEqual(JSON.parse(source));
  });
  it('dumpをそのまま', async () => {
    const fileSystem = new MockFileSystem();
    const source = await fs.readFile('src/filemanager/test/filesystem.initial.json', 'utf8');
    fileSystem.undumpFromString(source);
    const target = fileSystem.dumpToString();
    expect(JSON.parse(target)).toEqual(JSON.parse(source));
  });
  it('何も回収されないはず', async () => {
    // 読み込み
    const fileSystem = new MockFileSystem();
    const source = await fs.readFile('src/filemanager/test/filesystem.initial.json', 'utf8');
    fileSystem.undumpFromString(source);

    // ガベコレ
    const { usedImageFiles, strayImageFiles } = await collectGarbage(fileSystem);
    const imageFolder = (await (await fileSystem.getRoot()).getNodeByName("画像"))!.asFolder()!;
    await purgeCollectedGarbage(fileSystem, imageFolder, strayImageFiles);

    // 正解と比較
    const target = fileSystem.dumpToString();
    expect(JSON.parse(target)).toEqual(JSON.parse(source));
  });
  it('TypeAを削除', async () => {
    // 読み込み
    const fileSystem = new MockFileSystem();
    const source = await fs.readFile('src/filemanager/test/filesystem.initial.json', 'utf8');
    fileSystem.undumpFromString(source);
    const desktop = (await (await fileSystem.getRoot()).getNodeByName("デスクトップ"))!.asFolder()!;
    const pictures = (await (await fileSystem.getRoot()).getNodeByName("画像"))!.asFolder()!;

    // 削除
    await destroyAndUnlink(fileSystem, "01HR78PS394VGSBNNH30CZX2HC" as NodeId, desktop);
    // await destroyAndUnlink(fileSystem, "01HR78ZA3EHYJ37WFST2Y0WHHB" as NodeId, pictures);

    // ガベコレ
    const { usedImageFiles, strayImageFiles } = await collectGarbage(fileSystem);
    await purgeCollectedGarbage(fileSystem, pictures, strayImageFiles);

    // 正解と比較
    const target = fileSystem.dumpToString();
    const correct = await fs.readFile('src/filemanager/test/filesystem.correct.typeA.json', 'utf8');
    expect(JSON.parse(target)).toEqual(JSON.parse(correct));
  });
  it('TypeBを削除', async () => {
    // 読み込み
    const fileSystem = new MockFileSystem();
    const source = await fs.readFile('src/filemanager/test/filesystem.initial.json', 'utf8');
    fileSystem.undumpFromString(source);
    const desktop = (await (await fileSystem.getRoot()).getNodeByName("デスクトップ"))!.asFolder()!;
    const pictures = (await (await fileSystem.getRoot()).getNodeByName("画像"))!.asFolder()!;

    // 削除
    await destroyAndUnlink(fileSystem, "01HR7908D2RFB5N0YZ3CGYW4SE" as NodeId, desktop);
    // await destroyAndUnlink(fileSystem, "01HR790VDG902PN9P6BS8JBZME" as NodeId, pictures);

    // ガベコレ
    const { usedImageFiles, strayImageFiles } = await collectGarbage(fileSystem);
    await purgeCollectedGarbage(fileSystem, pictures, strayImageFiles);

    // 正解と比較
    const target = fileSystem.dumpToString();
    const correct = await fs.readFile('src/filemanager/test/filesystem.correct.typeB.json', 'utf8');
    expect(JSON.parse(target)).toEqual(JSON.parse(correct));
  });
  it('TypeCを削除', async () => {
    // 読み込み
    const fileSystem = new MockFileSystem();
    const source = await fs.readFile('src/filemanager/test/filesystem.initial.json', 'utf8');
    fileSystem.undumpFromString(source);
    const desktop = (await (await fileSystem.getRoot()).getNodeByName("デスクトップ"))!.asFolder()!;
    const pictures = (await (await fileSystem.getRoot()).getNodeByName("画像"))!.asFolder()!;

    // 削除
    await destroyAndUnlink(fileSystem, "01HR791TBQKG02A1ENSDD5JGFR" as NodeId, desktop);
    // await destroyAndUnlink(fileSystem, "01HR792JBAR1KQYSCEC42HDJ9C" as NodeId, pictures);

    // ガベコレ
    const { usedImageFiles, strayImageFiles } = await collectGarbage(fileSystem);
    await purgeCollectedGarbage(fileSystem, pictures, strayImageFiles);

    // 正解と比較
    const target = fileSystem.dumpToString();
    const correct = await fs.readFile('src/filemanager/test/filesystem.correct.typeC.json', 'utf8');
    expect(JSON.parse(target)).toEqual(JSON.parse(correct));
  });
  it('キャラ画像、役者画像が残る', async () => {
    // 読み込み
    const fileSystem = new MockFileSystem();
    const source = await fs.readFile('src/filemanager/test/filesystem.roster.json', 'utf8');
    fileSystem.undumpFromString(source);

    // ガベコレ
    const { usedImageFiles, strayImageFiles } = await collectGarbage(fileSystem);
    const imageFolder = (await (await fileSystem.getRoot()).getNodeByName("画像"))!.asFolder()!;
    await purgeCollectedGarbage(fileSystem, imageFolder, strayImageFiles);

    // 正解と比較
    const target = fileSystem.dumpToString();
    expect(JSON.parse(target)).toEqual(JSON.parse(source));
  });
});
