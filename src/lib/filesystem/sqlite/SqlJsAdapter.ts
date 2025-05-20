import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'; // これでURLとして取得

export interface FilePersistenceProvider {
  readFile(name: string): Promise<Uint8Array | null>;
  writeFile(name: string, data: Uint8Array): Promise<void>;
  removeFile(name: string): Promise<void>;
  readText(name: string): Promise<string | null>;
  writeText(name: string, text: string): Promise<void>;
}

type Database = { prepare: Function; exec: Function; export: Function; };
type SqlJsStatic = { Database: any; };

function assert<T>(v: T, msg: string): asserts v is NonNullable<T> {
  if (v == null) throw new Error(msg);
}

export class SqlJsAdapter {
  private db: Database | null = null;
  private SQL: SqlJsStatic | null = null;
  private persistence: FilePersistenceProvider;
  private versionFileName = 'filesystem.version';
  private dbFilePrefix = 'filesystem.db.';
  private version: number = 1;
  private schemaVersion: number = 1; // PRAGMA user_version

  persistentSuspended = false; // 永続化中フラグ

  private wasmUrl: string;

  constructor(persistence: FilePersistenceProvider, wasmUrl: string) {
    this.persistence = persistence;
    this.wasmUrl = wasmUrl;
  }

  // open: バージョンファイルとDBファイルが揃っていなければ初期化
  async open(): Promise<void> {
    this.SQL = await initSqlJs(
      { locateFile: () => this.wasmUrl }
    );

    // versionファイルを読む。なければ初期化（両方作成）
    let version: number;
    let versionExists = false;
    try {
      version = await this._readVersion();
      versionExists = true;
    } catch {
      version = 1;
      versionExists = false;
    }
    const dbFileName = this.dbFilePrefix + version;
    let dbFileData: Uint8Array | null = null;
    try {
      dbFileData = await this.persistence.readFile(dbFileName);
    } catch {
      dbFileData = null;
    }

    if (versionExists && dbFileData) {
      this.db = new (this.SQL!).Database(dbFileData);
      this.version = version;
      // スキーマバージョン取得
      this.schemaVersion = this._getSchemaVersion();
      // スキーママイグレーション入口
      await this._migrateSchemaIfNeeded();
    } else {
      // 初期化: version=1, 両ファイル作成
      this.db = new (this.SQL!).Database();
      this._initSchema();
      this.schemaVersion = this._getSchemaVersion();
      await this._writeVersion(1);
      assert(this.db, 'DB not initialized');
      const data = this.db.export();
      await this.persistence.writeFile(this.dbFilePrefix + '1', data);
      this.version = 1;
    }
  }

  // バージョンファイルを読む
  private async _readVersion(): Promise<number> {
    const text = await this.persistence.readText(this.versionFileName);
    if (text == null) throw new Error('No version file');
    const v = parseInt(text.trim(), 10);
    if (isNaN(v)) throw new Error('Invalid version');
    return v;
  }

  // バージョンファイルを書き換える
  private async _writeVersion(version: number): Promise<void> {
    await this.persistence.writeText(this.versionFileName, String(version));
  }

  // スキーマ初期化
  private _initSchema() {
    assert(this.db, 'DB not initialized');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        type TEXT,
        attributes TEXT
      );
      CREATE TABLE IF NOT EXISTS children (
        parentId TEXT,
        bindId TEXT,
        name TEXT,
        childId TEXT,
        idx INTEGER
      );
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        inlineContent TEXT,
        blobPath TEXT,
        mediaType TEXT
      );
      PRAGMA user_version = 1;
    `);
  }

  // PRAGMA user_version取得
  private _getSchemaVersion(): number {
    assert(this.db, 'DB not initialized');
    const res = this.db.prepare('PRAGMA user_version;');
    res.step();
    const obj = res.getAsObject();
    res.free();
    return obj.user_version ?? 0;
  }

  // スキーママイグレーション雛形
  private async _migrateSchemaIfNeeded(): Promise<void> {
    // 例: if (this.schemaVersion < 2) { ... ALTER TABLE ... }
    // 必要に応じて persist() で user_version を上げる
  }

  // SELECT系
  async select(sql: string, params: any[] = []): Promise<any[]> {
    assert(this.db, 'DB not initialized');
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const result: any[] = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    return result;
  }

  async selectOne(sql: string, params: any[] = []): Promise<any | null> {
    const rows = await this.select(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  // INSERT/UPDATE/DELETE系
  async run(sql: string, params: any[] = []): Promise<void> {
    assert(this.db, 'DB not initialized');
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
  }

  // トランザクション
  async transaction<T>(cb: () => Promise<T>): Promise<T> {
    assert(this.db, 'DB not initialized');
    this.db.exec('BEGIN;');
    try {
      const result = await cb();
      this.db.exec('COMMIT;');
      return result;
    } catch (e) {
      this.db.exec('ROLLBACK;');
      throw e;
    }
  }

  // DBファイルへ永続化（アトミックな二相コミット: 新→旧削除）
  async persist(): Promise<void> {
    if (this.persistentSuspended) {
      return;
    }
    assert(this.db, 'DB not initialized');
    const newVersion = this.version + 1;
    const newDbFileName = this.dbFilePrefix + newVersion;
    const oldDbFileName = this.dbFilePrefix + this.version;
    const data = this.db.export();

    // 1. 新バージョンのDBファイルを直接正式名で上書き
    await this.persistence.writeFile(newDbFileName, data);

    // 2. versionファイルも正式名で上書き
    await this._writeVersion(newVersion);

    // 3. 旧DBファイル削除（新が書き込まれてから）
    try {
      await this.persistence.removeFile(oldDbFileName);
    } catch (e) {
      console.warn('Failed to remove old DB file:', oldDbFileName, e);
    }

    this.version = newVersion;
  }
}