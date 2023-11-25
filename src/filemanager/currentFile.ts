// 現在のファイルIDをSessionStorageに記録する関数
export async function recordCurrentFileId(id: string) {
  sessionStorage.setItem('currentFileId', id);
}

// SessionStorageから現在のファイルIDを取得する関数
export async function fetchCurrentFileId(): Promise<string | null> {
  return sessionStorage.getItem('currentFileId');
}
