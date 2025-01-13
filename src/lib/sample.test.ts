import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';

describe('Sample Test', () => {
  it('should display Node.js version', () => {
    console.log('window:', typeof window !== 'undefined');
    console.log('indexedDB:', typeof indexedDB !== 'undefined');
    console.log('window.indexedDB:', window.indexedDB);
    expect(indexedDB).toBeDefined();
  });
});