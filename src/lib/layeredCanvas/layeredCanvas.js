import { convertPointFromPageToNode } from "./convertPoint";

export class LayeredCanvas {
    constructor(c, size, onHint, editable) {
        this.canvas = c;
        this.canvas.paper = {};
        this.canvas.paper.size = size;
        this.canvas.paper.translate = [0, 0];
        this.canvas.paper.viewTranslate = [0, 0];
        this.canvas.paper.scale = [1, 1];
        this.context = this.canvas.getContext('2d');

        this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
        this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
        this.canvas.addEventListener('pointerleave', this.handlePointerLeave.bind(this));
        this.canvas.addEventListener('dragover', this.handleDragOver.bind(this));
        this.canvas.addEventListener('drop', this.handleDrop.bind(this));
        this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));

        this.layers = [];
        this.onHint = onHint;

        if (editable) {
            this.keyDownHandler = this.handleKeyDown.bind(this);
            document.addEventListener('keydown', this.keyDownHandler);
            setInterval(() => {this.redrawIfRequired();}, 33);
        }
    }

    cleanup() {
        if (this.keyDownHandler) {
            document.removeEventListener('keydown', this.keyDownHandler);
        }
    }

    getPaperSize() {
        return this.canvas.paper.size;
    }

    setPaperSize(size) {
        this.canvas.paper.size = size;
    }
    
    getCanvasPosition(event) {
        const p = convertPointFromPageToNode(this.canvas, event.pageX, event.pageY);
        return [Math.floor(p.x), Math.floor(p.y)];
    }

    getPaperPosition(event) {
        const paper = this.canvas.paper;
        const centering = [
            this.canvas.width * 0.5 + paper.translate[0],
            this.canvas.height * 0.5 + paper.translate[1],
        ];
        const p = this.getCanvasPosition(event);
        const [tx, ty] = [p[0] - centering[0], p[1] - centering[1]];
        const [sx, sy] = [tx / paper.scale[0], ty / paper.scale[1]];
        const [x, y] = [sx + paper.size[0] * 0.5, sy + paper.size[1] * 0.5];
        return [x, y];
    }

    paperPositionToCanvasPosition(p) {
        const paper = this.canvas.paper;
        const centering = [
            this.canvas.width * 0.5 + paper.translate[0],
            this.canvas.height * 0.5 + paper.translate[1],
        ];
        const [sx, sy] = [p[0] - paper.size[0] * 0.5, p[1] - paper.size[1] * 0.5];
        const [tx, ty] = [sx * paper.scale[0], sy * paper.scale[1]];
        const [x, y] = [tx + centering[0], ty + centering[1]];
        return [x, y];
    }
    
    handlePointerDown(event) {
        const p = this.getPaperPosition(event);
        
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            this.payload = layer.accepts(p);
            if (this.payload) {
                layer.pointerDown(p, this.payload);
                this.draggingLayer = layer;
                this.dragStart = p;
                this.canvas.setPointerCapture(event.pointerId);
                break;
            }
        }

        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            if (layer !== this.draggingLayer) {
                layer.unfocus();
            }
        }

        this.redrawIfRequired();
    }
      
    handlePointerMove(event) {
        this.pointerCursor = this.getPaperPosition(event);
        if (this.draggingLayer) {
            this.draggingLayer.pointerMove(this.pointerCursor, this.payload); // 念のため別の実体
            this.redrawIfRequired();
        } else {
            let p = this.pointerCursor;
            for (let i = this.layers.length - 1; i >= 0; i--) {
                const layer = this.layers[i];
                if (layer.pointerHover(p)) {
                    p = null;
                }
            }
            this.redrawIfRequired();
        }
    }
    
    handlePointerUp(event) {
        if (this.draggingLayer) {
            this.draggingLayer.pointerUp(this.getPaperPosition(event), this.payload);
            this.draggingLayer = null;
            this.redrawIfRequired();
        }
    }
      
    handlePointerLeave(event) {
        this.pointerCursor = [-1,-1];
        if (this.draggingLayer) {
            this.handlePointerUp(event);
            this.redrawIfRequired();
            this.canvas.releasePointerCapture(event.pointerId);
        }
        this.onHint(null, null);
    }

    handleContextMenu(event) {
        if (this.draggingLayer) {
            event.preventDefault();
            this.draggingLayer.pointerCancel();
            this.draggingLayer = null;
            this.redrawIfRequired();
        }
    }
        
    handleDragOver(event) {
        event.preventDefault();
    }

    handleDrop(event) {
        this.pointerCursor = this.getPaperPosition(event);
        event.preventDefault();  // ブラウザのデフォルトの画像表示処理をOFF
        var file = event.dataTransfer.files[0];
        if (!file) return; // 選択テキストのドロップなど

        if (!file.type.match(/^image\/(png|jpeg|gif|webp)$/)) return;

        var image = new Image();
        var reader = new FileReader();

        reader.onload = (e) => {
            image.onload = () => {
                console.log("image loaded", image.width, image.height);
                for (let i = this.layers.length - 1; i >= 0; i--) {
                    const layer = this.layers[i];
                    if (layer.dropped(image, this.pointerCursor)) {
                        this.redrawIfRequired();
                        break;
                    }
                }
            };
            image.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    handleDoubleClick(event) {
        this.pointerCursor = this.getPaperPosition(event);
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            if (layer.beforeDoubleClick(this.pointerCursor)) {
                return;
            }
        }
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            if (layer.doubleClicked(this.pointerCursor)) {
                this.redrawIfRequired();
                break;
            }
        }
    }

    async handleKeyDown(event) {
        if (!this.pointerCursor || !this.isPointerOnCanvas(this.pointerCursor)) {
            return;
        }

        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            if (await layer.keyDown(event)) {
                event.preventDefault();
                this.redrawIfRequired();
                break;
            }
        }
    }

    handleWheel(event) {
        const delta = event.deltaY;
        const p = this.getPaperPosition(event);
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            if (layer.wheel(delta)) {
                this.redrawIfRequired();
                break;
            }
        }
    }

    render() {
        for (let layer of this.layers) {
            layer.prerender();
        }

        this.context.fillStyle = "rgb(240,240,240)";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.context.save();
        this.context.translate(this.canvas.width * 0.5, this.canvas.height * 0.5);  // 画面中央
        this.context.translate(...this.canvas.paper.translate);                     // パン
        this.context.translate(...this.canvas.paper.viewTranslate);                 // パン(一時)
        this.context.scale(...this.canvas.paper.scale);       // 拡大縮小
        this.context.translate(-this.canvas.paper.size[0] * 0.5, -this.canvas.paper.size[1] * 0.5); // 紙面中央
        for (let layer of this.layers) {
            layer.render(this.context);
        }
        this.context.restore();
    }

    redraw() {
        this.render();
    }
    
    redrawIfRequired() {
        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            if (layer.redrawRequired) {
                for (let j = i ; j < this.layers.length; j++) {
                    this.layers[j].redrawRequired = false;
                }
                this.render();
                return;
            }
        }
    }
    
    addLayer(layer) {
        layer.canvas = this.canvas;
        layer.context = this.context;
        layer.hint = (p, s) => {
            const q = this.paperPositionToCanvasPosition(p);
            this.onHint(q, s);
        }
        this.layers.push(layer);
    }
    
    isPointerOnCanvas(m) {
        const rect = this.canvas.getBoundingClientRect();
        const f = 0 <= m[0] && m[0] <= rect.width && 0 <= m[1] && m[1] <= rect.height;
        return f;
    }
}


let pointerSequence = { // mixin
    pointerDown(p, payload) {
        this.pointerHandler = this.pointer(p, payload);
        this.pointerHandler.next(null);
    },
    pointerMove(p, payload) {
        if (this.pointerHandler) {
            this.pointerHandler.next(p);
        }
    },
    pointerUp(p, payload) {
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

export function sequentializePointer(layerClass) {
    layerClass.prototype.pointerDown = pointerSequence.pointerDown;
    layerClass.prototype.pointerMove = pointerSequence.pointerMove;
    layerClass.prototype.pointerUp = pointerSequence.pointerUp;
    layerClass.prototype.pointerCancel = pointerSequence.pointerCancel;
}

export class Layer {
    canvas=null;
    context=null;

    constructor() {}

    getPaperSize() {return this.canvas.paper.size;}
    redraw() { this.redrawRequired = true; }

    pointerHover(point) {}
    accepts(point) { return null; }
    unfocus() {}
    pointerDown(point, payload) {}
    pointerMove(point, payload) {}
    pointerUp(point, payload) {}
    pointerCancel() {}
    prerender() {}
    render(ctx) {}
    dropped(image, position) { return false; }
    beforeDoubleClick(position) { return false; }
    doubleClicked(position) { return false; }
    async keyDown(event) { return false; }
    wheel(delta) { return false; }
}
