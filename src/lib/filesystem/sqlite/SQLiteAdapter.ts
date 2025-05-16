import { initSqlite } from './initSqlite';

type SqliteDB = any;
type FileSystemFileHandle = globalThis.FileSystemFileHandle;

export class SQLiteAdapter {
  db: SqliteDB | null = null;
  dbFileHandle: FileSystemFileHandle | null = null;

  async open(dbFileHandle: FileSystemFileHandle) {
    this.dbFileHandle = dbFileHandle;
    const sqlite3 = await initSqlite();

    let dbBuffer: Uint8Array | null = null;
    try {
      const file = await dbFileHandle.getFile();
      dbBuffer = new Uint8Array(await file.arrayBuffer());
    } catch (e) {
      dbBuffer = null;
    }
    this.db = dbBuffer ? new sqlite3.oo1.DB(dbBuffer) : new sqlite3.oo1.DB();
    this.initSchema();
  }

  initSchema() {
    if (!this.db) return;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS nodes(
        id TEXT PRIMARY KEY,
        type TEXT CHECK(type IN ('file','folder')),
        attributes JSON DEFAULT '{}'
      );
      CREATE TABLE IF NOT EXISTS children(
        parentId TEXT,
        bindId TEXT,
        name TEXT,
        childId TEXT,
        idx INTEGER,
        PRIMARY KEY(parentId, bindId)
      );
      CREATE TABLE IF NOT EXISTS files(
        id TEXT PRIMARY KEY,
        inlineContent TEXT,
        blobPath TEXT,
        mediaType TEXT
      );
      CREATE INDEX IF NOT EXISTS children_parent_idx ON children(parentId, idx);
    `);
  }

  async persist() {
    if (!this.db || !this.dbFileHandle) return;
    const buffer = this.db.export();
    const writable = await this.dbFileHandle.createWritable();
    await writable.write(buffer);
    await writable.close();
  }

  run(sql: string, params: any[] = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
  }

  select(sql: string, params: any[] = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const result: any[] = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    return result;
  }

  selectOne(sql: string, params: any[] = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    let row = null;
    if (stmt.step()) {
      row = stmt.getAsObject();
    }
    stmt.free();
    return row;
  }

  async transaction(fn: () => Promise<void>) {
    this.db.exec('BEGIN');
    try {
      await fn();
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
}