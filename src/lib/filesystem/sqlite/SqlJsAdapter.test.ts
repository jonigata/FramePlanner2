import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SqlJsAdapter, FilePersistenceProvider } from './SqlJsAdapter';
import path from 'path';

// Node.jsで絶対パスを生成
const wasmPath = path.resolve(
  __dirname,
  '../../../../node_modules/sql.js/dist/sql-wasm.wasm'
);

class MockPersistence implements FilePersistenceProvider {
  files: Record<string, Uint8Array> = {};
  texts: Record<string, string> = {};
  removed: string[] = [];
  async readFile(name: string) {
    return this.files[name] ?? null;
  }
  async writeFile(name: string, data: Uint8Array) {
    this.files[name] = data;
  }
  async removeFile(name: string) {
    this.removed.push(name);
    delete this.files[name];
  }
  async readText(name: string) {
    return this.texts[name] ?? null;
  }
  async writeText(name: string, text: string) {
    this.texts[name] = text;
  }
}

describe('SqlJsAdapter', () => {
  let persistence: MockPersistence;
  let adapter: SqlJsAdapter;

  beforeEach(() => {
    persistence = new MockPersistence();
    adapter = new SqlJsAdapter(persistence, wasmPath);
  });

  it('open: 新規初期化時にバージョンファイルとDBファイルを作成する', async () => {
    await adapter.open();
    expect(persistence.texts['filesystem.version']).toBe('1');
    expect(persistence.files['filesystem.db.1']).toBeInstanceOf(Uint8Array);
    expect(adapter['version']).toBe(1);
  });

  it('open: 既存バージョンファイルとDBファイルがある場合はそれを使う', async () => {
    // まず新規作成
    await adapter.open();
    await adapter.run('CREATE TABLE test (id TEXT PRIMARY KEY, value TEXT)');
    await adapter.run('INSERT INTO test VALUES (?, ?)', ['a', 'b']);
    await adapter.persist();

    // 新しいアダプタで既存ファイルを読む
    const adapter2 = new SqlJsAdapter(persistence, wasmPath);
    await adapter2.open();
    expect(adapter2['version']).toBe(2);
    const row = await adapter2.selectOne('SELECT * FROM test');
    expect(row).toEqual({ id: 'a', value: 'b' });
  });

  it('selectOne: クエリ実行で1件返す', async () => {
    await adapter.open();
    await adapter.run('INSERT INTO nodes (id, type, attributes) VALUES (?, ?, ?)', ['id1', 'type1', 'attr1']);
    const result = await adapter.selectOne('SELECT * FROM nodes WHERE id = ?', ['id1']);
    expect(result).toEqual({ id: 'id1', type: 'type1', attributes: 'attr1' });
  });

  it('run: クエリ実行できる', async () => {
    await adapter.open();
    await adapter.run('INSERT INTO nodes (id, type, attributes) VALUES (?, ?, ?)', ['id2', 'type2', 'attr2']);
    const row = await adapter.selectOne('SELECT * FROM nodes WHERE id = ?', ['id2']);
    expect(row).toEqual({ id: 'id2', type: 'type2', attributes: 'attr2' });
  });

  it('persist: バージョンアップしてファイルが保存・削除される', async () => {
    await adapter.open();
    await adapter.run('INSERT INTO nodes (id, type, attributes) VALUES (?, ?, ?)', ['id3', 'type3', 'attr3']);
    await adapter.persist();
    expect(persistence.texts['filesystem.version']).toBe('2');
    expect(persistence.files['filesystem.db.2']).toBeInstanceOf(Uint8Array);
    expect(persistence.removed).toContain('filesystem.db.1');
    expect(adapter['version']).toBe(2);

    // 新しいアダプタでデータが残っているか確認
    const adapter2 = new SqlJsAdapter(persistence, wasmPath);
    await adapter2.open();
    const row = await adapter2.selectOne('SELECT * FROM nodes WHERE id = ?', ['id3']);
    expect(row).toEqual({ id: 'id3', type: 'type3', attributes: 'attr3' });
  });

  it('transaction: 成功時はコミットされ、失敗時はロールバックされる', async () => {
    await adapter.open();
    await adapter.run('CREATE TABLE tx (id TEXT PRIMARY KEY, value TEXT)');
    // 成功時
    await adapter.transaction(async () => {
      await adapter.run('INSERT INTO tx VALUES (?, ?)', ['t1', 'v1']);
    });
    let row = await adapter.selectOne('SELECT * FROM tx WHERE id = ?', ['t1']);
    expect(row).toEqual({ id: 't1', value: 'v1' });

    // 失敗時
    await expect(
      adapter.transaction(async () => {
        await adapter.run('INSERT INTO tx VALUES (?, ?)', ['t2', 'v2']);
        throw new Error('fail');
      })
    ).rejects.toThrow('fail');
    // t2はロールバックされているはず
    row = await adapter.selectOne('SELECT * FROM tx WHERE id = ?', ['t2']);
    expect(row).toBeNull();
  });
});