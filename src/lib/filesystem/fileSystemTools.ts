// 共通のファイルシステムユーティリティ関数

export interface CountLinesResult {
  lineCount: number;
  hasHeader: boolean;
  headerLineCount?: number;
}

/**
 * ストリームの行数をカウントし、ヘッダの有無も判定する
 * ヘッダがある場合は、ヘッダに含まれる実際のデータ行数も取得する
 */
export async function countLines(stream: ReadableStream<Uint8Array>): Promise<CountLinesResult> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let lineCount = 0;
  let buffer = '';
  let isFirstLine = true;
  let hasHeader = false;
  let headerLineCount: number | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.trim() && isFirstLine) {
          // 最後の行がヘッダかチェック
          try {
            const parsed = JSON.parse(buffer.trim());
            if (parsed.version && typeof parsed.lineCount === 'number') {
              hasHeader = true;
              headerLineCount = parsed.lineCount;
            }
          } catch {
            // JSONパースエラーの場合はヘッダなし
          }
        }
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // 改行を探して行数をカウント
      let start = 0;
      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n', start)) !== -1) {
        if (isFirstLine) {
          // 最初の行がヘッダかチェック
          const firstLine = buffer.slice(0, newlineIndex).trim();
          try {
            const parsed = JSON.parse(firstLine);
            if (parsed.version && typeof parsed.lineCount === 'number') {
              hasHeader = true;
              headerLineCount = parsed.lineCount;
            }
          } catch {
            // JSONパースエラーの場合はヘッダなし
          }
          isFirstLine = false;
        }
        lineCount++;
        start = newlineIndex + 1;
      }
      buffer = buffer.slice(start);
    }
  } finally {
    reader.releaseLock();
  }
  
  return { lineCount, hasHeader, headerLineCount };
}
