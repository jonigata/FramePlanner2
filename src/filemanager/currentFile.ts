// 現在のファイルIDをSessionStorageに記録する関数
import type { NodeId } from '../lib/filesystem/fileSystem';

export type CurrentFileInfo = {
  id: NodeId;
  fileSystem: 'cloud' | 'local';
}

export async function recordCurrentFileInfo(info: CurrentFileInfo): Promise<void> {
  sessionStorage.setItem('currentFileId', JSON.stringify(info));
}

// SessionStorageから現在のファイルIDを取得する関数
export async function fetchCurrentFileInfo(): Promise<CurrentFileInfo | null> {
  const info = sessionStorage.getItem('currentFileId');
  if (!info) { return null; }

  const parsed = JSON.parse(info);
  // 互換性
  if (typeof parsed === 'string') {
    console.log('compatibility');
    return {id: parsed, fileSystem: 'local'};
  }
  return parsed;  
}
