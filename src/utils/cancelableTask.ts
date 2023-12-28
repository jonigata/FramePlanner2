export class DelayedCommiter {
  when: number;
  timerId: number | null;
  commit: () => void;

  constructor(commit: () => void) {
    this.when = 0;
    this.timerId = null;
    this.commit = commit;
  }

  schedule(ms: number) {
    // 未来の方を選ぶ
    const newWhen = Date.now() + ms;
    if (this.when < newWhen) {
      if (this.timerId !== null) {
        clearTimeout(this.timerId);
      }
      this.when = newWhen;
      this.timerId = window.setTimeout(() => {
        this.commit();
        this.when = 0;
        this.timerId = null;
      }, ms);
    }
  }

  cancel() {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.when = 0;
      this.timerId = null;
    }
  }

  force() {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.commit();
      this.when = 0;
      this.timerId = null;
    }
  }
  
}
