// 現在のファイルIDをSessionStorageに記録する関数
import type { NodeId } from '../lib/filesystem/fileSystem';

export type CurrentFileInfo = {
  id: NodeId;
  fileSystem: 'cloud' | 'local' | 'fsa';
}

export async function recordCurrentFileInfo(info: CurrentFileInfo): Promise<void> {
  sessionStorage.setItem('currentFileId', JSON.stringify(info));
}

// SessionStorageから現在のファイルIDを取得する関数
export async function fetchCurrentFileInfo(): Promise<CurrentFileInfo | null> {
  const info = sessionStorage.getItem('currentFileId');
  if (!info) { return null; }

  try {
    const parsed = JSON.parse(info);
    return parsed;  
  }
  catch {
    // 互換性
    return {id: info as NodeId, fileSystem: 'local'};
  }
}

export async function clearCurrentFileInfo(): Promise<void> {
  sessionStorage.removeItem('currentFileId');
}
