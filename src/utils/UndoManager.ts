export class UndoManager {
  private history: ImageData[] = [];
  private historyIndex: number = -1;
  private readonly maxHistory: number;
  private readonly canvasWidth: number;
  private readonly canvasHeight: number;
  private getCanvas: () => HTMLCanvasElement | undefined;

  constructor(getCanvas: () => HTMLCanvasElement | undefined, canvasWidth: number, canvasHeight: number, maxHistory: number = 20) {
    this.getCanvas = getCanvas;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.maxHistory = maxHistory;
  }

  saveCurrentStateToHistory() {
    const canvas = this.getCanvas();
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // アンドゥ後に新しい操作をした場合、履歴を切り詰める
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    const imageData = ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
    this.history.push(imageData);

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.historyIndex = this.history.length - 1;
    // console.log(`History saved: ${this.historyIndex + 1}/${this.history.length}`);
  }

  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.restoreState();
    // console.log(`Undo: ${this.historyIndex + 1}/${this.history.length}`);
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.restoreState();
    // console.log(`Redo: ${this.historyIndex + 1}/${this.history.length}`);
  }

  restoreState() {
    const canvas = this.getCanvas();
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx || this.historyIndex < 0 || this.historyIndex >= this.history.length) return;

    ctx.resetTransform();
    ctx.putImageData(this.history[this.historyIndex], 0, 0);
  }

  get canUndo() {
    return this.historyIndex > 0;
  }

  get canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  get currentIndex() {
    return this.historyIndex;
  }

  get length() {
    return this.history.length;
  }
}