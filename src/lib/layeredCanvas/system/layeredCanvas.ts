import { bodyDragging } from "../../../uiStore";
import { convertPointFromPageToNode } from "../tools/geometry/convertPoint";
import type { Vector } from "../tools/geometry/geometry";

type OnHint = (p: Vector, s: string | null) => void;

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
    this.ctx = c.getContext('2d');
    this.translate = [0, 0];
    this.viewTranslate = [0, 0];
    this.scale = 1;
    this.dirty = true;
    this.onHint = (p, s) => {
      const q: Vector = p ? this.viewportPositionToCanvasPosition(p) : [-1,-1];
      onHint(q, s);
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


};


export interface Dragging {
  layer: Layer;
  payload: any;
}

export class Layer {
  paper: Paper = null;
  hint: (position: Vector, message: string) => void; // bind(this)しないと面倒なので

  constructor() { this.hint = this.showHint.bind(this); }

  getPaperSize() {return this.paper.size;}
  calculateLayout(matrix: DOMMatrix) {}
  redraw() { this.redrawRequired = true; }
  showHint(position: Vector, message: string) {this.paper.showHint(position, message); }

  pointerHover(position: Vector): boolean { return false; }
  accepts(position: Vector, button: number) { return null; }
  changeFocus(dragging: Dragging) {}
  pointerDown(position: Vector, payload: any) {}
  pointerMove(position: Vector, payload: any) {}
  pointerUp(position: Vector, payload: any) {}
  pointerCancel(position: Vector, payload: any) {}
  prerender() {}
  render(ctx: CanvasRenderingContext2D) {}
  dropped(position: Vector, image: HTMLImageElement) { return false; }
  beforeDoubleClick(position: Vector) { return false; }
  doubleClicked(position: Vector) { return false; }
  async keyDown(position: Vector, event: KeyboardEvent) { return false; }
  wheel(position: Vector, delta: number) { return false; }
  flushHints(viewport: Viewport) {}

  redrawRequired_: boolean = false;
  get redrawRequired(): boolean { return this.redrawRequired_; }
  set redrawRequired(f: boolean) { this.redrawRequired_ = f; }
}

export class Paper {
  matrix: DOMMatrix;
  size: Vector;
  layers: Layer[];
  hint: { position: Vector, message: string } = null;

  constructor(size: Vector) {
    this.size = size;
    this.layers = [];
  }

  viewportPositionToPaperPosition(p: Vector): Vector {
    const [sx, sy] = p;
    const [x, y] = [sx + this.size[0] * 0.5, sy + this.size[1] * 0.5];
    return [x, y];
  }

  paperPositionToViewportPosition(p: Vector): Vector {
    const [sx, sy] = [p[0] - this.size[0] * 0.5, p[1] - this.size[1] * 0.5];
    return [sx, sy];
  }

  handleAccepts(p: Vector, button: number): Dragging {
    var result: Dragging = null;
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      const payload = layer.accepts(p, button);
      if (payload) {
        result = {layer, payload};
        break;
      }
    }
    return result;
  }

  changeFocus(dragging: Dragging): void {
    for (let layer of this.layers) {
      layer.changeFocus(dragging);
    }
  }

  handlePointerDown(p: Vector, dragging: Dragging): void {
    dragging.layer.pointerDown(p, dragging.payload);
  }
      
  handlePointerHover(p: Vector): void {
    let q = p;
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (layer.pointerHover(q)) {
        q = null;
      }
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
        
  handleDrop(p: Vector, image: HTMLImageElement): void {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (layer.dropped(p, image)) {
        break;
      }
    }
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

  handleDoubleClicked(p: Vector): void {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (layer.doubleClicked(p)) {
        break;
      }
    }
  }

  async handleKeyDown(p: Vector, event: KeyboardEvent): Promise<void> {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (await layer.keyDown(p, event)) {
        event.preventDefault();
        break;
      }
    }
  }

  handleWheel(p: Vector, delta: number): void {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (layer.wheel(p, delta)) {
        break;
      }
    }
  }

  prerender(): void {
    for (let layer of this.layers) {
      layer.prerender();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.setTransform(this.matrix);
    for (let layer of this.layers) {
      layer.render(ctx);
    }
    ctx.restore();
  }

  get redrawRequired(): boolean {
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      if (layer.redrawRequired) {
        return true;
      }
    }
    return false;
  }

  set redrawRequired(value: boolean) {
    for (let layer of this.layers) {
      layer.redrawRequired = value;
    }
  }
  
  addLayer(layer: Layer): void {
    layer.paper = this
    this.layers.push(layer);
  }

  calculateLayout(matrix: DOMMatrix): void {
    const m = matrix.translate(this.size[0] * -0.5, this.size[1] * -0.5);
    this.matrix = m;
    for (let layer of this.layers) {
      layer.calculateLayout(m);
    }
  }

  showHint(position: Vector, message: string): void {
    this.hint = {position, message};
  }

  flushHints(viewport: Viewport) {
    if (this.hint) {
      const p = this.paperPositionToViewportPosition(this.hint.position);
      viewport.onHint(p, this.hint.message);
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

};


export class LayeredCanvas {
  keyDownHandler: (event: KeyboardEvent) => void;
  pointerCursor: Vector;
  viewport: Viewport;
  rootPaper: Paper;
  listeners: [string, ((event: Event) => void)][] = [];
  dragging: Dragging;

  constructor(viewport: Viewport, editable: boolean) {
    this.viewport = viewport;
    this.rootPaper = new Paper([0,0]);

    const beforeHandler = () => {
      this.calculateLayout();
    }

    const afterHandler = () => {
      this.calculateLayout();
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
      addEventListener('pointerdown', this.handlePointerDown);
      addEventListener('pointermove', this.handlePointerMove);
      addEventListener('pointerup', this.handlePointerUp);
      addEventListener('pointerleave', this.handlePointerLeave);
      addEventListener('dragover', this.handleDragOver);
      addEventListener('drop', this.handleDrop);
      addEventListener('dblclick', this.handleDoubleClick);
      addEventListener('contextmenu', this.handleContextMenu);
      addEventListener('wheel', this.handleWheel);

      this.keyDownHandler = this.handleKeyDown.bind(this);
      document.addEventListener('keydown', this.keyDownHandler);
      setInterval(() => {this.redrawIfRequired();}, 33);
    }
  }

  cleanup(): void {
    if (this.keyDownHandler) {
      document.removeEventListener('keydown', this.keyDownHandler);
    }
    for (let listener of this.listeners) {
      this.viewport.canvas.removeEventListener(...listener);
    }
  }

  // canvasの中央を原点(1枚目の紙の中央)とする

  pagePositionToCanvasPosition(event: { pageX: number, pageY: number}): Vector {
    const p = convertPointFromPageToNode(this.viewport.canvas, event.pageX, event.pageY);
    return [Math.floor(p.x), Math.floor(p.y)];
  }

  viewportPositionToPaperPosition(p: Vector) {
    return this.rootPaper.viewportPositionToPaperPosition(p);
  }

  pagePositionToPaperPosition(event: { pageX: number, pageY: number }): Vector {
    const p = this.pagePositionToCanvasPosition(event);
    const q = this.viewport.canvasPositionToViewportPosition(p);
    return this.viewportPositionToPaperPosition(q);
  }

  paperPositionToCanvasPosition(paper: Paper, p: Vector): Vector {
    const [sx, sy] = [p[0] - paper.size[0] * 0.5, p[1] - paper.size[1] * 0.5];
    return this.viewport.viewportPositionToCanvasPosition([sx, sy]);
  }
    
  handlePointerDown(event: PointerEvent): void {
    const p = this.pagePositionToPaperPosition(event);
    this.dragging = this.rootPaper.handleAccepts(p, event.button);
    if (this.dragging) {
      this.viewport.canvas.setPointerCapture(event.pointerId);
      this.rootPaper.handlePointerDown(p, this.dragging);
    }
    this.rootPaper.changeFocus(this.dragging);
  }
      
  handlePointerMove(event: PointerEvent): void {
    const p = this.pagePositionToPaperPosition(event);
    this.pointerCursor = p;
    if (this.dragging) {
      this.rootPaper.handlePointerMove(p, this.dragging);
    } else {
      this.rootPaper.handlePointerHover(p);
    }
  }
    
  handlePointerUp(event: PointerEvent): void {
    if (this.dragging) {
      const p = this.pagePositionToPaperPosition(event);
      this.rootPaper.handlePointerUp(p, this.dragging);
      this.viewport.canvas.releasePointerCapture(event.pointerId);
      this.dragging = null;
    }
  }
      
  handlePointerLeave(event: PointerEvent): void {
    if (this.dragging) {
      const p = this.pagePositionToPaperPosition(event);
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
      const p = this.pagePositionToPaperPosition(event);
      this.pointerCursor = p;
      this.rootPaper.handleCancel(p, this.dragging);
    }
  }
        
  handleDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  async handleDrop(event: DragEvent): Promise<void> {
    const p = this.pagePositionToPaperPosition(event);
    this.pointerCursor = p;

    event.preventDefault();  // ブラウザのデフォルトの画像表示処理をOFF
    var file = event.dataTransfer.files[0];
    if (!file) return; // 選択テキストのドロップなど
    if (!file.type.match(/^image\/(png|jpeg|gif|webp)$/)) return;

    var image = new Image();
    image.src = URL.createObjectURL(file);
    await image.decode();

    console.log("image loaded", image.width, image.height);
    this.rootPaper.handleDrop(p, image);
  }

  handleDoubleClick(event: PointerEvent): void {
    const p = this.pagePositionToPaperPosition(event);
    this.pointerCursor = p;
    if (this.rootPaper.handleBeforeDoubleClick(p)) { return; }
    this.rootPaper.handleDoubleClicked(p);
  }

  handleWheel(event: WheelEvent): void {
    const delta = event.deltaY;
    const p = this.pagePositionToPaperPosition(event);
    this.rootPaper.handleWheel(p, delta);
  }

  async handleKeyDown(event: KeyboardEvent): Promise<void> {
    // このハンドラだけはdocumentに登録する
    this.calculateLayout();
    if (!this.isPointerOnCanvas()) {
      return;
    }

    await this.rootPaper.handleKeyDown(this.pointerCursor, event);
    this.redrawIfRequired();
  }

  render(): void {
    this.calculateLayout();

    const canvas = this.viewport.canvas;
    const ctx = this.viewport.ctx;

    ctx.fillStyle = "rgb(240,240,240)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.rootPaper.prerender();
    this.rootPaper.render(ctx);
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

  isPointerOnCanvas(): boolean {
    const m = this.pointerCursor
    if (m == null) { return false; }
    const mm = this.paperPositionToCanvasPosition(this.rootPaper, m);
    const rect = this.viewport.canvas.getBoundingClientRect();
    const f = 0 <= mm[0] && mm[0] <= rect.width && 0 <= mm[1] && mm[1] <= rect.height;
    return f;
  }

  calculateLayout(): void {
    if (!this.viewport.dirty) { return; }

    this.viewport.dirty = false;
    const canvas = this.viewport.canvas;
    let matrix = new DOMMatrix();

    // root
    matrix = matrix.translate(canvas.width * 0.5, canvas.height * 0.5); // Centering on screen
    matrix = matrix.translate(...this.viewport.translate);             // Pan
    matrix = matrix.translate(...this.viewport.viewTranslate);         // Temporary Pan
    matrix = matrix.scale(this.viewport.scale, this.viewport.scale);

    this.rootPaper.calculateLayout(matrix);
  }
}

interface LayerPointerMethods {
  pointerDown: (p: Vector, payload: any) => void;
  pointerMove: (p: Vector, payload: any) => void;
  pointerUp: (p: Vector, payload: any) => void;
  pointerCancel: (p: Vector, payload: any) => void;
}

interface SequentializableLayer {
  prototype: LayerPointerMethods;  
}

let pointerSequence: LayerPointerMethods = { // mixin
  pointerDown(p: Vector, payload: any) {
    this.pointerHandler = this.pointer(p, payload);
    this.pointerHandler.next(null);
  },
  pointerMove(p: Vector, _payload: any) {
    if (this.pointerHandler) {
      this.pointerHandler.next(p);
    }
  },
  pointerUp(_p: Vector, _payload: any) {
    if (this.pointerHandler) {
      this.pointerHandler.next(null);
      this.pointerHandler = null;
    }
  },
  pointerCancel() {
    if (this.pointerHandler) {
      this.pointerHandler.throw('cancel');
      this.pointerHandler = null;
    }
  },

/*
    sample pointer handler
    *pointer(p) {
        while (p = yield) {
            console.log("pointer", p);
        }
    }
*/
};

export function sequentializePointer(layerClass: SequentializableLayer) {
  layerClass.prototype.pointerDown = pointerSequence.pointerDown;
  layerClass.prototype.pointerMove = pointerSequence.pointerMove;
  layerClass.prototype.pointerUp = pointerSequence.pointerUp;
  layerClass.prototype.pointerCancel = pointerSequence.pointerCancel;
}
