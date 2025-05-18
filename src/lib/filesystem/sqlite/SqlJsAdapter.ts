import initSqlJs from 'sql.js';

type FileSystemDirectoryHandle = globalThis.FileSystemDirectoryHandle;
type Database = { prepare: Function; exec: Function; export: Function; };
type SqlJsStatic = { Database: any; };

function assert<T>(v: T, msg: string): asserts v is NonNullable<T> {
  if (v == null) throw new Error(msg);
}

export class SqlJsAdapter {
  private db: Database | null = null;
  private SQL: SqlJsStatic | null = null;
  private dirHandle: FileSystemDirectoryHandle | null = null;
  private versionFileName = 'filesystem.version';
  private dbFilePrefix = 'filesystem.db.';
  private version: number = 1;
  private schemaVersion: number = 1; // PRAGMA user_version

  // open: バージョンファイルとDBファイルが揃っていなければ初期化
  async open(dirHandle: FileSystemDirectoryHandle): Promise<void> {
    this.dirHandle = dirHandle;
    this.SQL = await initSqlJs();

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
    let dbFile: File | null = null;
    try {
      dbFile = await dirHandle.getFileHandle(dbFileName, { create: false }).then(fh => fh.getFile());
    } catch {
      dbFile = null;
    }

    if (versionExists && dbFile) {
      const buf = await dbFile.arrayBuffer();
      this.db = new (this.SQL!).Database(new Uint8Array(buf));
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
      const newHandle = await this.dirHandle!.getFileHandle(this.dbFilePrefix + '1', { create: true });
      const newWritable = await newHandle.createWritable({ keepExistingData: false });
      await newWritable.write(data);
      await newWritable.close();
      this.version = 1;
    }
  }

  // バージョンファイルを読む
  private async _readVersion(): Promise<number> {
    assert(this.dirHandle, 'No dirHandle');
    const vh = await this.dirHandle.getFileHandle(this.versionFileName, { create: false });
    const file = await vh.getFile();
    const text = await file.text();
    const v = parseInt(text.trim(), 10);
    if (isNaN(v)) throw new Error('Invalid version');
    return v;
  }

  // バージョンファイルを書き換える
  private async _writeVersion(version: number): Promise<void> {
    assert(this.dirHandle, 'No dirHandle');
    const vh = await this.dirHandle.getFileHandle(this.versionFileName, { create: true });
    const writable = await vh.createWritable({ keepExistingData: false });
    await writable.write(String(version));
    await writable.close();
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
    assert(this.db, 'DB not initialized');
    assert(this.dirHandle, 'No dirHandle');
    const newVersion = this.version + 1;
    const newDbFileName = this.dbFilePrefix + newVersion;
    const oldDbFileName = this.dbFilePrefix + this.version;
    const data = this.db.export();

    // 1. 新バージョンのDBファイルを直接正式名で上書き
    const newHandle = await this.dirHandle.getFileHandle(newDbFileName, { create: true });
    const newWritable = await newHandle.createWritable({ keepExistingData: false });
    await newWritable.write(data);
    await newWritable.close();

    // 2. versionファイルも正式名で上書き
    await this._writeVersion(newVersion);

    // 3. 旧DBファイル削除（新が書き込まれてから）
    try {
      await this.dirHandle.removeEntry(oldDbFileName, { recursive: false });
    } catch (e) {
      console.warn('Failed to remove old DB file:', oldDbFileName, e);
    }

    this.version = newVersion;
  }
}