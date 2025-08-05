/**
 * createCoalescingWork v2
 * -----------------------
 *   - 同時実行 1 本に制限し、pending を取りこぼさない
 *   - job() が throw/reject してもループが固まらない
 *   - onError で例外を拾う or デフォルトで console.error
 */
export function createCoalescingWork(
  job: () => Promise<unknown>,
  onError: (err: unknown) => void = console.error,
): () => void {
  let running = false;  // いま実行中か
  let pending = false;  // 待ちがあるか

  async function runLoop(): Promise<void> {
    try {
      do {
        pending = false;
        console.log('coalescingWork start');
        await job();          // ここで throw/reject し得る
        console.log('coalescingWork end');
    } while (pending);
    } catch (err) {
      onError(err);           // 例外を報告
      // 失敗しても「次の pending」があるなら回す
      if (pending) {
        return runLoop();
      }
    } finally {
      running = false;        // ここは必ず通る
    }
  }

  return function request(): void {
    pending = true;
    if (!running) {
      running = true;
      void runLoop();         // fire-and-forget
    }
  };
}
