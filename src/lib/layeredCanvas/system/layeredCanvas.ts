import { bodyDragging } from "../../../uiStore";
import { convertPointFromPageToNode } from "../tools/geometry/convertPoint";
import type { Vector } from "../tools/geometry/geometry";

type OnHint = (p: Vector, s: string | null) => void;

export interface Viewport {
  translate: Vector;
  viewTranslate: Vector;
  scale: Vector;
  onHint: OnHint;
};

export interface Dragging {
  layer: Layer;
  payload: any;
}

export class Layer {
  paper: Paper = null;
  redrawRequired: boolean = false;
  hint: OnHint = null;

  constructor() {}

  getPaperSize() {return this.paper.size;}
  redraw() { this.redrawRequired = true; }

  pointerHover(position: Vector): boolean { return false; }
  accepts(position: Vector) { return null; }
  changeFocus(layer: Layer) {}
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
}

export class Paper {
  canvas: HTMLCanvasElement;
  viewport: Viewport;
  size: Vector;
  layers: Layer[];

  constructor(canvas: HTMLCanvasElement, viewport: Viewport, size: Vector) {
    this.canvas = canvas;
    this.viewport = viewport;
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

  handleAccepts(p: Vector): Dragging {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      const payload = layer.accepts(p);
      if (payload) {
        return {layer, payload};
      }
    }
    return null;
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

  handleBeforeDoubleClick(p: Vector): void {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (layer.beforeDoubleClick(p)) {
        return;
      }
    }
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

  render(): void {
    const ctx = this.canvas.getContext('2d');

    ctx.fillStyle = "rgb(240,240,240)";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.canvas.width * 0.5, this.canvas.height * 0.5); // 画面中央
    ctx.translate(...this.viewport.translate);                             // パン
    ctx.translate(...this.viewport.viewTranslate);                         // パン(一時)
    ctx.scale(...this.viewport.scale);                                     // 拡大縮小
    ctx.translate(-this.size[0] * 0.5, -this.size[1] * 0.5); // 紙面中央
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

  resetRedrawRequired(): void {
    for (let layer of this.layers) {
      layer.redrawRequired = false;
    }
  }
  
  addLayer(layer: Layer): void {
    layer.paper = this
    layer.hint = (p, s) => {
      const q = this.paperPositionToViewportPosition(p);
      this.viewport.onHint(q, s);
    }
    this.layers.push(layer);
  }

  changeFocus(draggingLayer: Layer): void {
    for (let layer of this.layers) {
      layer.changeFocus(draggingLayer);
    }
  }
};


export class LayeredCanvas {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  keyDownHandler: (event: KeyboardEvent) => void;
  pointerCursor: Vector;
  viewport: Viewport;
  rootPaper: Paper;
  listeners: [string, ((event: Event) => void)][];
  dragging: Dragging;

  constructor(c: HTMLCanvasElement, onHint: OnHint, editable: boolean) { // TODO: editableいらなそう
    this.canvas = c;
    this.context = this.canvas.getContext('2d');

    this.viewport = { 
      translate: [0, 0],
      viewTranslate: [0, 0], 
      scale: [1, 1], 
      onHint: (p, s) => {
        const q = this.viewportPositionToCanvasPosition(p);
        onHint(q, s);
      }
    };
    this.rootPaper = new Paper(c, this.viewport, [0,0]);

    const addEventListener = (name: string, handler: (event: Event) => void) =>  {
      const f = handler.bind(this);
      c.addEventListener(name, f)
      this.listeners.push([name, f]);
    }

    addEventListener('pointerdown', this.handlePointerDown);
    addEventListener('pointermove', this.handlePointerMove);
    addEventListener('pointerup', this.handlePointerUp);
    addEventListener('pointerleave', this.handlePointerLeave);
    addEventListener('dragover', this.handleDragOver);
    addEventListener('drop', this.handleDrop);
    addEventListener('dblclick', this.handleDoubleClick);
    addEventListener('contextmenu', this.handleContextMenu);
    addEventListener('wheel', this.handleWheel);

    if (editable) {
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
      this.canvas.removeEventListener(...listener);
    }
  }

  pagePositionToCanvasPosition(event: { pageX: number, pageY: number}): Vector {
    const p = convertPointFromPageToNode(this.canvas, event.pageX, event.pageY);
    return [Math.floor(p.x), Math.floor(p.y)];
  }

  canvasPositionToViewportPosition(p: Vector): Vector {
    const v = this.viewport;
    const centering = [
      this.canvas.width * 0.5 + v.translate[0],
      this.canvas.height * 0.5 + v.translate[1],
    ];
    const [tx, ty] = [p[0] - centering[0], p[1] - centering[1]];
    const [sx, sy] = [tx / v.scale[0], ty / v.scale[1]];
    return [sx, sy];
  }

  viewportPositionToPaperPosition(p: Vector) {
    return this.rootPaper.viewportPositionToPaperPosition(p);
  }

  pagePositionToPaperPosition(event: { pageX: number, pageY: number }): Vector {
    const p = this.pagePositionToCanvasPosition(event);
    const q = this.canvasPositionToViewportPosition(p);
    return this.viewportPositionToPaperPosition(q);
  }

  viewportPositionToCanvasPosition(p: Vector): Vector {
    const [sx, sy] = p;
    const v = this.viewport;
    const centering = [
      this.canvas.width * 0.5 + v.translate[0],
      this.canvas.height * 0.5 + v.translate[1],
    ];
    const [tx, ty] = [sx * v.scale[0], sy * v.scale[1]];
    const [x, y] = [tx + centering[0], ty + centering[1]];
    return [x, y];
  }
    
  paperPositionToCanvasPosition(paper: Paper, p: Vector): Vector {
    const [sx, sy] = [p[0] - paper.size[0] * 0.5, p[1] - paper.size[1] * 0.5];
    return this.viewportPositionToCanvasPosition([sx, sy]);
  }
    
  handlePointerDown(event: PointerEvent): void {
    const p = this.pagePositionToCanvasPosition(event);
    this.dragging = this.rootPaper.handleAccepts(p);
    if (this.dragging) {
      this.canvas.setPointerCapture(event.pointerId);
      this.rootPaper.handlePointerDown(p, this.dragging);
      this.rootPaper.changeFocus(this.dragging.layer);
    }
    this.redrawIfRequired();
  }
      
  handlePointerMove(event: PointerEvent): void {
    const p = this.pagePositionToCanvasPosition(event);
    this.pointerCursor = p;
    if (this.dragging) {
      this.rootPaper.handlePointerMove(p, this.dragging);
    } else {
      this.rootPaper.handlePointerHover(p);
    }
    this.redrawIfRequired();
  }
    
  handlePointerUp(event: PointerEvent): void {
    const p = this.pagePositionToCanvasPosition(event);
    this.rootPaper.handlePointerUp(p, this.dragging);
    this.canvas.releasePointerCapture(event.pointerId);
    this.dragging = null;
    this.redrawIfRequired();
  }
      
  handlePointerLeave(event: PointerEvent): void {
    this.pointerCursor = null;
    const p = this.pagePositionToCanvasPosition(event);
    this.rootPaper.handlePointerLeave(p, this.dragging);
    this.canvas.releasePointerCapture(event.pointerId);
    this.dragging = null;
    this.redrawIfRequired();
    this.viewport.onHint(null, null);
  }

  handleContextMenu(event: PointerEvent): void {
    const p = this.pagePositionToCanvasPosition(event);
    this.pointerCursor = p;
    this.rootPaper.handleCancel(p, this.dragging);
    this.redrawIfRequired();
  }
        
  handleDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  async handleDrop(event: DragEvent): void {
    const p = this.pagePositionToCanvasPosition(event);
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
    const p = this.pagePositionToCanvasPosition(event);
    this.pointerCursor = p;
    this.rootPaper.handleBeforeDoubleClick(p);
    this.rootPaper.handleDoubleClicked(p);
    this.redrawIfRequired();
  }

  async handleKeyDown(event: KeyboardEvent): Promise<void> {
    if (!this.isPointerOnCanvas()) {
      return;
    }

    await this.rootPaper.handleKeyDown(this.pointerCursor, event);
    this.redrawIfRequired();
  }

  handleWheel(event: WheelEvent): void {
    const delta = event.deltaY;
    const p = this.pagePositionToCanvasPosition(event);
    this.rootPaper.handleWheel(p, delta);
    this.redrawIfRequired();
  }

  render(): void {
    this.rootPaper.prerender();
    this.rootPaper.render();
  }

  redraw(): void {
    this.render();
  }
    
  redrawIfRequired(): void {
    if (this.rootPaper.redrawRequired) {
      this.rootPaper.resetRedrawRequired();
      this.render();
      return;
    }
  }

  isPointerOnCanvas(): boolean {
    const m = this.pointerCursor
    if (m == null) { return false; }
    const rect = this.canvas.getBoundingClientRect();
    const f = 0 <= m[0] && m[0] <= rect.width && 0 <= m[1] && m[1] <= rect.height;
    return f;
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
