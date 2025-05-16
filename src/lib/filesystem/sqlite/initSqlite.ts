// SQLite WASM (sqlite-wasm) ローダ
// 初回呼び出し時に sqlite-wasm を非同期ロードし、以降キャッシュする

let sqlite3: any = null;
let sqliteInitPromise: Promise<any> | null = null;

export async function initSqlite(): Promise<any> {
  if (sqlite3) return sqlite3;
  if (sqliteInitPromise) return sqliteInitPromise;

  // sqlite-wasm の ESM 版を使う場合
  sqliteInitPromise = import('sqlite-wasm').then((module) => {
    // module.default が sqlite3 インスタンスまたは初期化関数
    sqlite3 = module.default;
    return sqlite3;
  });

  return sqliteInitPromise;
}