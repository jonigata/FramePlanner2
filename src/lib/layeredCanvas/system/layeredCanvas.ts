import { handleDataTransfer } from "../tools/fileUtil";
import { convertPointFromPageToNode } from "../tools/geometry/convertPoint";
import type { Vector, Rect } from "../tools/geometry/geometry";
import { rectIntersectsRect, scale2D } from "../tools/geometry/geometry";

type OnHint = (p: Rect | null, s: string | null) => void;

export class Viewport {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  translate: Vector;
  viewTranslate: Vector;
  scale: number;
  dirty: boolean;
  onHint: OnHint;

  constructor(c: HTMLCanvasElement, onHint: OnHint) {
    this.canvas = c;
    this.ctx = c.getContext('2d')!;
    this.translate = [0, 0];
    this.viewTranslate = [0, 0];
    this.scale = 1;
    this.dirty = true;
    this.onHint = (p, s) => {
      onHint(p, s);
    };
  }

  viewportPositionToCanvasPosition(p: Vector): Vector {
    const [sx, sy] = p;
    const centering = [
      this.canvas.width * 0.5 + this.translate[0],
      this.canvas.height * 0.5 + this.translate[1],
    ];
    const [tx, ty] = [sx * this.scale, sy * this.scale];
    const [x, y] = [tx + centering[0], ty + centering[1]];
    return [x, y];
  }
    
  canvasPositionToViewportPosition(p: Vector): Vector {
    const centering = [
      this.canvas.width * 0.5 + this.translate[0],
      this.canvas.height * 0.5 + this.translate[1],
    ];
    const [tx, ty] = [p[0] - centering[0], p[1] - centering[1]];
    const [sx, sy] = [tx / this.scale, ty / this.scale];
    return [sx, sy];
  }

  getCanvasSize(): Vector {
    return [this.canvas.width, this.canvas.height];
  }

  getCanvasCenter(): Vector {
    return scale2D(this.getCanvasSize(), 0.5);
  }

  getDpr() {
    // canvasの拡大率（ブラウザの拡大率(Retinaを含む)が反映されていることを期待している）
    const styleWidth = parseFloat(window.getComputedStyle(this.canvas).width);
    const dpr = this.canvas.width / styleWidth;
    return dpr;
  }
};


export interface Dragging {
  layer: Layer;
  payload: any;
}

export interface Picked {
  selected: boolean;
  action: () => void;
}

export interface Layer {
  getPaperSize(): void;
  rebuildPageLayouts(matrix: DOMMatrix): void;
  redraw(): void;
  pierce(): void;
  showHint(rect: Rect | null, message: string | null): void;

  renderDepths(): number[];
  acceptDepths(): number[];
  pointerHover(position: Vector, depth: number): Layer | null;
  pointerUnhover(litLayer: Layer): void;
  accepts(position: Vector, button: number, depth: number): any;
  pointerDown(position: Vector, payload: any): void;
  pointerMove(position: Vector, payload: any): void;
  pointerUp(position: Vector, payload: any): void;
  pointerCancel(position: Vector, payload: any): void;
  prerender(): void;
  render(ctx: CanvasRenderingContext2D, depth: number): void;
  dropped(position: Vector, media: HTMLCanvasElement | HTMLVideoElement | string): boolean;
  pasted(position: Vector, media: HTMLCanvasElement | HTMLVideoElement | string): boolean;
  beforeDoubleClick(position: Vector): boolean;
  doubleClicked(position: Vector): boolean;
  keyDown(position: Vector, event: KeyboardEvent): Promise<boolean>;
  wheel(position: Vector, delta: number): boolean;
  flushHints(viewport: Viewport): void;
  pick(p: Vector): Picked[];
  tearDown(): void;

  paper: Paper;
  redrawRequired: boolean;
  pierceRequired: boolean;
  mode: any;
}

// pierce, pick
// pierceは貫通走査リクエスト
// pickは貫通されるオブジェクトとそれが選ばれたときのアクションを列挙する

export class LayerBase implements Layer {
  paper!: Paper;

  hint: (rect: Rect | null, message: string | null) => void; // bind(this)しないと面倒なので

  constructor() { this.hint = this.showHint.bind(this); }

  getPaperSize() {return this.paper.size;}
  rebuildPageLayouts(matrix: DOMMatrix) {}
  redraw() { this.redrawRequired = true; }
  pierce() { this.pierceRequired = true; }
  showHint(rect: Rect | null, message: string | null) {this.paper.showHint(rect, message); }
  tearDown() {} // デフォルトの実装は何もしない

  renderDepths(): number[] { return []; }
  acceptDepths(): number[] { return []; }
  pointerHover(position: Vector, depth: number): Layer | null { return null; }
  pointerUnhover(litLayer: Layer) {}
  accepts(position: Vector, button: number, depth: number): any { return null; }
  pointerDown(position: Vector, payload: any) {}
  pointerMove(position: Vector, payload: any) {}
  pointerUp(position: Vector, payload: any) {}
  pointerCancel(position: Vector, payload: any) {}
  prerender() {}
  render(ctx: CanvasRenderingContext2D, depth: number) {}
  dropped(position: Vector, media: HTMLCanvasElement | HTMLVideoElement) { return false; }
  pasted(position: Vector, media: HTMLCanvasElement | HTMLVideoElement) { return false; }
  beforeDoubleClick(position: Vector) { return false; }
  doubleClicked(position: Vector) { return false; }
  async keyDown(position: Vector, event: KeyboardEvent) { return false; }
  wheel(position: Vector, delta: number) { return false; }
  flushHints(viewport: Viewport) {}
  pick(p: Vector): Picked[] { return []; }

  redrawRequired_: boolean = false;
  get redrawRequired(): boolean { return this.redrawRequired_; }
  set redrawRequired(f: boolean) { this.redrawRequired_ = f; }

  pierceRequired_: boolean = false;
  get pierceRequired(): boolean { return this.pierceRequired_; }
  set pierceRequired(f: boolean) { this.pierceRequired_ = f; }

  mode_: any = null;
  set mode(mode: any) { this.mode_ = mode; }
  get mode(): any { return this.mode_; }
}

export class Paper {
  matrix!: DOMMatrix;
  size: Vector;
  layers: Layer[];
  hint: { rect: Rect | null, message: string | null } | null = null;
  root: boolean;

  constructor(size: Vector, root: boolean) {
    this.size = size;
    this.root = root;
    this.layers = [];
  }

  tearDown() {
    // 全てのレイヤーのtearDownを呼び出す
    for (const layer of this.layers) {
      layer.tearDown();
    }
    // 自身のクリーンアップ
    this.layers = [];
    this.hint = null;
  }

  renderDepths(): number[] { 
    // layer全部から集めてsort/uniq
    const depths = this.layers.flatMap(e => e.renderDepths());
    const uniq = [...new Set(depths)];
    uniq.sort((a, b) => a - b);
    return uniq;
  }

  acceptDepths(): number[] {
    const depths = this.layers.flatMap(e => e.acceptDepths());
    const uniq = [...new Set(depths)];
    uniq.sort((a, b) => a - b);
    return uniq;
  }

  handleAccepts(p: Vector, button: number, depth: number): Dragging | null {
    var result: Dragging | null = null;
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (layer.acceptDepths().indexOf(depth) < 0) { continue; }
      const payload = layer.accepts(p, button, depth);
      if (payload) {
        result = {layer, payload};
        break;
      }
    }
    return result;
  }

  handlePointerDown(p: Vector, dragging: Dragging): void {
    dragging.layer.pointerDown(p, dragging.payload);
  }
      
  handlePointerHover(p: Vector, depth: number): Layer | null {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (layer.acceptDepths().indexOf(depth) < 0) { continue; }
      const litLayer = layer.pointerHover(p, depth);
      if (litLayer) {
        return litLayer
      }
    }
    return null;
  }

  handlePointerUnhover(litLayer: Layer): void {
    for (let layer of this.layers) {
      layer.pointerUnhover(litLayer);
    }
  }
    
  handlePointerMove(p: Vector, dragging: Dragging): void {
    dragging.layer.pointerMove(p, dragging.payload);
  }
    
  handlePointerUp(p: Vector, dragging: Dragging): void {
    dragging.layer.pointerUp(p, dragging.payload);
  }
      
  handlePointerLeave(p: Vector, dragging: Dragging): void {
    dragging.layer.pointerUp(p, dragging.payload);
  }

  handleCancel(p: Vector, dragging: Dragging): void {
    dragging.layer.pointerCancel(p, dragging.payload);
  }
        
  handleDrop(p: Vector, media: HTMLCanvasElement | HTMLVideoElement | string): boolean {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (layer.dropped(p, media)) {
        return true;
      }
    }
    return false;
  }

  handlePaste(p: Vector, media: HTMLCanvasElement | HTMLVideoElement | string): boolean {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (layer.pasted(p, media)) {
        return true;
      }
    }
    return false;
  }

  handleBeforeDoubleClick(p: Vector): boolean {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (layer.beforeDoubleClick(p)) {
        return true;
      }
    }
    return false;
  }

  handleDoubleClicked(p: Vector): boolean {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (layer.doubleClicked(p)) {
        return true;
      }
    }
    return false;
  }

  async handleKeyDown(p: Vector, event: KeyboardEvent): Promise<boolean> {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (await layer.keyDown(p, event)) {
        event.preventDefault();
        return true;
      }
    }
    return false;
  }

  handleWheel(p: Vector, delta: number): boolean {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (layer.wheel(p, delta)) {
        return true;
      }
    }
    return false;
  }

  pick(p: Vector): Picked[] {
    let picked = [];
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      picked.push(...layer.pick(p));
    }
    return picked;
  }

  prerender(): void {
    for (let layer of this.layers) {
      layer.prerender();
    }
  }

  render(ctx: CanvasRenderingContext2D, depth: number): void {
    // canvasの外なら表示しない
    if (!this.root) {
      const q0 = this.matrix.transformPoint({x:0, y:0});
      const q1 = this.matrix.transformPoint({x:this.size[0], y:this.size[1]});
      const r: Rect = [q0.x, q0.y, q1.x - q0.x, q1.y - q0.y];
      if (!rectIntersectsRect(r, [0, 0, ctx.canvas.width, ctx.canvas.height])) {
        return;
      }
    }

    ctx.save();
    ctx.setTransform(this.matrix);
    for (let layer of this.layers) {
      if (layer.renderDepths().indexOf(depth) < 0) { continue; }
      layer.render(ctx, depth);
    }
    ctx.restore();
  }

  get redrawRequired(): boolean {
    return this.layers.some(e => e.redrawRequired);
  }

  set redrawRequired(value: boolean) {
    for (let layer of this.layers) {
      layer.redrawRequired = value;
    }
  }

  get pierceRequired(): boolean {
    return this.layers.some(e => e.pierceRequired);
  }

  set pierceRequired(value: boolean) {
    for (let layer of this.layers) {
      layer.pierceRequired = value;
    }
  }
  
  addLayer(layer: Layer): void {
    layer.paper = this
    this.layers.push(layer);
  }

  rebuildPageLayouts(matrix: DOMMatrix): void {
    const m = matrix.translate(this.size[0] * -0.5, this.size[1] * -0.5);
    this.matrix = m;
    for (let layer of this.layers) {
      layer.rebuildPageLayouts(m);
    }
  }

  showHint(rect: Rect | null, message: string | null): void {
    this.hint = {rect, message};
  }

  flushHints(viewport: Viewport) {
    if (this.hint) {
      const r = this.hint.rect;
      if (r == null) {
        viewport.onHint(null, null);
      } else {
        const q = [r[0], r[1]];
        const qq = this.matrix.transformPoint({x:q[0], y:q[1]});
        const dpr = viewport.getDpr();
        viewport.onHint([qq.x / dpr, qq.y / dpr, r[2] / dpr, r[3] / dpr], this.hint.message);
      }
      this.hint = null;
    }

    for (let layer of this.layers) {
      layer.flushHints(viewport);
    }
  }

  contains(v: Vector) {
    const [x, y] = v;
    const [w, h] = this.size;
    const f = 0 <= x && x <= w && 0 <= y && y <= h;
    return f;
  }

  findLayer<T extends Layer>(type: { new(...args:any[]): T }): T | null {
    for (let layer of this.layers) {
      if (layer instanceof type) {
        return layer;
      }
    }
    return null;
  }

  mode_: any = null;
  set mode(mode: any) { this.mode_ = mode; this.layers.forEach(e => e.mode = mode); }
  get mode(): any { return this.mode_; }
};


export class LayeredCanvas {
  private renderCount = 0;
  private lastRenderCountLog = performance.now();
  keyDownHandler: ((event: KeyboardEvent) => void) | null = null;
  viewport: Viewport;
  rootPaper: Paper;
  listeners: [string, ((event: Event) => void)][] = [];
  dragging: Dragging | null = null;

  // layeredCanvasより長い寿命を持つ
  get pointerCursor(): Vector | null {return (this.viewport.canvas as any)["pointerCursor"];}
  set pointerCursor(p: Vector | null) {(this.viewport.canvas as any)["pointerCursor"] = p;}

  constructor(viewport: Viewport, editable: boolean) {
    this.viewport = viewport;
    this.rootPaper = new Paper([0,0], true);

    document.fonts.addEventListener('loadingdone', (event) => {
      // console.tag("fonts.onloadingdone", "orange", event);
    });

    const beforeHandler = () => {
      this.rebuildPageLayouts();
    }

    const afterHandler = () => {
      this.rebuildPageLayouts();
      this.pierceIfRequired();
      this.redrawIfRequired();
      this.rootPaper.flushHints(this.viewport);
    }

    const addEventListener = (name: string, handler: (event: Event) => void) => {
      const wrappedHandler = (event: Event) => {
        beforeHandler();
        handler.bind(this)(event);
        afterHandler();
      };
  
      const f = wrappedHandler.bind(this);
      this.viewport.canvas.addEventListener(name, f);
      this.listeners.push([name, f]);
    };

    if (editable) {
      addEventListener('pointerdown', this.handlePointerDown as EventListener);
      addEventListener('pointermove', this.handlePointerMove as EventListener);
      addEventListener('pointerup', this.handlePointerUp as EventListener);
      addEventListener('pointerleave', this.handlePointerLeave as EventListener);
      addEventListener('dragover', this.handleDragOver as EventListener);
      addEventListener('drop', this.handleDrop as unknown as EventListener);
      addEventListener('paste', this.handlePaste as unknown as EventListener);
      addEventListener('dblclick', this.handleDoubleClick as EventListener);
      addEventListener('contextmenu', this.handleContextMenu as EventListener);
      addEventListener('wheel', this.handleWheel as EventListener);

      this.keyDownHandler = this.handleKeyDown.bind(this);
      document.addEventListener('keydown', this.keyDownHandler);
      
      // Add render counter
      setInterval(() => {
        const now = performance.now();
        const elapsed = now - this.lastRenderCountLog;
        if (elapsed >= 1000) { // Every second
            const fps = Math.round(this.renderCount * 1000 / elapsed);
            if (fps > 0) {
                // console.log(`Renders per second: ${fps}`);
            }
            this.renderCount = 0;
            this.lastRenderCountLog = now;
        }
      }, 1000);

      setInterval(() => {this.redrawIfRequired();}, 33);
    }
  }

  takeOver() {
    if (this.listeners.length === 0) { return; }
    if (this.pointerCursor) {
      this.rebuildPageLayouts();
      this.doPointerHover(this.pointerCursor);
    }
  }

  cleanup(): void {
    if (this.keyDownHandler) {
      document.removeEventListener('keydown', this.keyDownHandler);
    }
    for (let listener of this.listeners) {
      this.viewport.canvas.removeEventListener(...listener);
    }
    // rootPaperとその配下のレイヤーをクリーンアップ
    this.rootPaper.tearDown();
  }

  eventPositionToCanvasPosition(event: { pageX: number, pageY: number}): Vector {
    const p = convertPointFromPageToNode(this.viewport.canvas, event.pageX, event.pageY);
    const dpr = this.viewport.getDpr();
    return [Math.floor(p.x * dpr), Math.floor(p.y * dpr)];
  }

  viewportPositionToRootPaperPosition(p: Vector): Vector {
    const [w, h] = this.rootPaper.size;
    const [sx, sy] = p;
    const [x, y] = [sx + w * 0.5, sy + h * 0.5];
    return [x, y];
  }

  eventPositionToRootPaperPosition(event: { pageX: number, pageY: number }): Vector {
    const p = this.eventPositionToCanvasPosition(event);
    const q = this.viewport.canvasPositionToViewportPosition(p);
    return this.viewportPositionToRootPaperPosition(q);
  }

  rootPaperPositionToCanvasPosition(p: Vector): Vector {
    const paper = this.rootPaper;
    const [sx, sy] = [p[0] - paper.size[0] * 0.5, p[1] - paper.size[1] * 0.5];
    return this.viewport.viewportPositionToCanvasPosition([sx, sy]);
  }
    
  handlePointerDown(event: PointerEvent): void {
    const p = this.eventPositionToRootPaperPosition(event);

    const depths = this.rootPaper.acceptDepths().toReversed(); // inputなのでrenderの逆順
    for (let depth of depths) {
      this.dragging = this.rootPaper.handleAccepts(p, event.button, depth);
      if (this.dragging) { break; }
    }
    if (this.dragging) {
      this.viewport.canvas.setPointerCapture(event.pointerId);
      this.rootPaper.handlePointerDown(p, this.dragging);
    }
  }
      
  handlePointerMove(event: PointerEvent): void {
    const p = this.eventPositionToRootPaperPosition(event);
    this.pointerCursor = p;
    if (this.dragging) {
      this.rootPaper.handlePointerMove(p, this.dragging);
    } else {
      this.doPointerHover(p);
    }
  }
    
  handlePointerUp(event: PointerEvent): void {
    if (this.dragging) {
      const p = this.eventPositionToRootPaperPosition(event);
      this.rootPaper.handlePointerUp(p, this.dragging);
      this.viewport.canvas.releasePointerCapture(event.pointerId);
      this.dragging = null;
    }
  }
      
  handlePointerLeave(event: PointerEvent): void {
    if (this.dragging) {
      const p = this.eventPositionToRootPaperPosition(event);
      this.rootPaper.handlePointerLeave(p, this.dragging);
      this.viewport.canvas.releasePointerCapture(event.pointerId);
      this.dragging = null;
    }
    this.pointerCursor = null;
    this.viewport.onHint(null, null);
  }

  handleContextMenu(event: PointerEvent): void {
    event.preventDefault();
    if (this.dragging) {
      const p = this.eventPositionToRootPaperPosition(event);
      this.pointerCursor = p;
      this.rootPaper.handleCancel(p, this.dragging);
    }
  }
        
  handleDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  async handleDrop(event: DragEvent): Promise<void> {
    const p = this.eventPositionToRootPaperPosition(event);
    this.pointerCursor = p;

    event.preventDefault();  // ブラウザのデフォルトの画像表示処理をOFF
    const mediaResources = await handleDataTransfer(event.dataTransfer!);
    for (let media of mediaResources) {
      this.rootPaper.handleDrop(p, media);
    }
  }

  async handlePaste(event: ClipboardEvent): Promise<void> {
    if (event.clipboardData == null) { return; }
    if (this.pointerCursor == null) { return; }

    const mediaResources = await handleDataTransfer(event.clipboardData);
    console.log("handlePaste", mediaResources.length);
    for (let media of mediaResources) {
      this.rootPaper.handlePaste(this.pointerCursor, media);
    }
  }

  handleDoubleClick(event: PointerEvent): void {
    const p = this.eventPositionToRootPaperPosition(event);
    this.pointerCursor = p;
    if (this.rootPaper.handleBeforeDoubleClick(p)) { return; }
    this.rootPaper.handleDoubleClicked(p);
  }

  handleWheel(event: WheelEvent): void {
    const delta = event.deltaY;
    const p = this.eventPositionToRootPaperPosition(event);
    this.rootPaper.handleWheel(p, delta);
  }

  async handleKeyDown(event: KeyboardEvent): Promise<void> {
    // このハンドラだけはdocumentに登録する
    this.rebuildPageLayouts();
    if (!this.isPointerOnCanvas()) {
      return;
    }

    await this.rootPaper.handleKeyDown(this.pointerCursor!, event);
    this.redrawIfRequired();
  }

  render(): void {
    this.renderCount++;
    this.rebuildPageLayouts();

    const canvas = this.viewport.canvas;
    const ctx = this.viewport.ctx;
    const renderTimes: {depth: number, time: number}[] = [];

    ctx.fillStyle = "rgb(240,240,240)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.rootPaper.prerender();

    const depths = this.rootPaper.renderDepths();
    for (let depth of depths) {
        const startTime = performance.now();
        this.rootPaper.render(ctx, depth);
        const endTime = performance.now();
        renderTimes.push({
            depth: depth,
            time: endTime - startTime
        });
    }

    // Log render times
    // console.log(`Render times per depth: ${renderTimes.map(({depth, time}) => `${depth}: ${time.toFixed(2)}ms`).join(', ')}`);  
  }

  redraw(): void {
    this.render();
  }
    
  redrawIfRequired(): void {
    if (this.rootPaper.redrawRequired) {
      this.rootPaper.redrawRequired = false;
      this.render();
      return;
    }
  }

  pierceIfRequired(): void {
    if (this.rootPaper.pierceRequired) {
      this.rootPaper.pierceRequired = false;
      const picked = this.rootPaper.pick(this.pointerCursor!);

      if (0 < picked.length) {
        // 選択されたものがある場合はその次のactionを実行
        // 選択されたものがない場合は最初のactionを実行
        const index = picked.findIndex(e => e.selected);
        if (0 <= index) {
          if (index < picked.length - 1) {
            const next = picked[index + 1];
            next.action();
          } else {
            picked[0].action();
          }
        } else {
          const next = picked[0];
          next.action();
        }
      }
    }
  }

  isPointerOnCanvas(): boolean {
    const m = this.pointerCursor
    if (m == null) { return false; }
    const mm = this.rootPaperPositionToCanvasPosition(m);
    const rect = this.viewport.canvas.getBoundingClientRect();
    const f = 0 <= mm[0] && mm[0] <= rect.width && 0 <= mm[1] && mm[1] <= rect.height;
    return f;
  }

  rebuildPageLayouts(): void {
    if (!this.viewport.dirty) { return; }

    this.viewport.dirty = false;
    const canvas = this.viewport.canvas;
    let matrix = new DOMMatrix();

    // root
    matrix = matrix.translate(canvas.width * 0.5, canvas.height * 0.5); // Centering on screen
    matrix = matrix.translate(...this.viewport.translate);             // Pan
    matrix = matrix.translate(...this.viewport.viewTranslate);         // Temporary Pan
    matrix = matrix.scale(this.viewport.scale, this.viewport.scale);

    this.rootPaper.rebuildPageLayouts(matrix);
  }

  doPointerHover(p: Vector) {
    const depths = this.rootPaper.acceptDepths().toReversed(); // inputなのでrenderの逆順
    let litLayer: Layer  | null = null;
    for (let depth of depths) {
      litLayer = this.rootPaper.handlePointerHover(p, depth);
      if (litLayer) { 
        break; 
      }
    }
    if (litLayer) {
      this.rootPaper.handlePointerUnhover(litLayer);
    }
  }

  set mode(mode: any) {this.rootPaper.mode = mode;}
  get mode(): any {return this.rootPaper.mode;}
}

interface LayerPointerMethods {
  pointerDown(p: Vector, payload: any): void;
  pointerMove(p: Vector, payload: any): void;
  pointerUp(p: Vector, payload: any): void;
  pointerCancel(): void;
}

type AnyGenerator = Generator<any, any, any> | AsyncGenerator<any, any, any> | null;

interface SequentializableLayerBase {
  pointer(p: Vector, payload: any): AnyGenerator;
}

const pointerSequence: LayerPointerMethods = {
  pointerDown(this: SequentializableLayerBase & { pointerHandler?: AnyGenerator }, p: Vector, payload: any) {
    this.pointerHandler = this.pointer(p, payload);
    this.pointerHandler!.next(null);
  },

  pointerMove(this: { pointerHandler?: AnyGenerator }, p: Vector, _payload: any) {
    if (this.pointerHandler) {
      this.pointerHandler.next(p);
    }
  },

  pointerUp(this: { pointerHandler?: AnyGenerator }, _p: Vector, _payload: any) {
    if (this.pointerHandler) {
      this.pointerHandler.next(null);
      this.pointerHandler = null;
    }
  },

  pointerCancel(this: { pointerHandler?: AnyGenerator }) {
    if (this.pointerHandler) {
      this.pointerHandler.throw('cancel');
      this.pointerHandler = null;
    }
  },
};

export function sequentializePointer(layerClass: new (...args: any[]) => any) {
  Object.assign(layerClass.prototype, pointerSequence);
}
