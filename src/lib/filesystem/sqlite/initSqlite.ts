// SQLite WASM (sql.js) ローダ
// 初回呼び出し時に sql.js を非同期ロードし、以降キャッシュする

let SQL: any = null;
let sqlJsInitPromise: Promise<any> | null = null;

export async function initSqlite(): Promise<any> {
  if (SQL) return SQL;
  if (sqlJsInitPromise) return sqlJsInitPromise;

  // sql.js の ESM 版を使う場合
  sqlJsInitPromise = import('sql.js').then((module) => {
    // デフォルトエクスポートが initSqlJs
    return module.default().then((SQL_) => {
      SQL = SQL_;
      return SQL;
    });
  });

  return sqlJsInitPromise;
}