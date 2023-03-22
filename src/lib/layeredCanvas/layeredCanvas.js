import { convertPointFromNodeToPage, convertPointFromPageToNode } from "./convertPoint";

export class LayeredCanvas {
    constructor(c, onHint) {
        console.log("initializeLayeredCanvas");
        this.canvas = c;
        this.context = this.canvas.getContext('2d');
        console.log([this.canvas.width, this.canvas.height]);

        this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
        this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
        this.canvas.addEventListener('pointerleave', this.handlePointerLeave.bind(this));
        this.canvas.addEventListener('dragover', this.handleDragOver.bind(this));
        this.canvas.addEventListener('drop', this.handleDrop.bind(this));

        this.layers = [];
        this.onHint = onHint;

        setInterval(() => {
            this.redrawIfRequired();
        }, 33);
    }

    cleanup() {
        this.canvas.removeEventListener('pointerdown', this.handlePointerDown.bind(this));
        this.canvas.removeEventListener('pointermove', this.handlePointerMove.bind(this));
        this.canvas.removeEventListener('pointerup', this.handlePointerUp.bind(this));
        this.canvas.removeEventListener('pointerleave', this.handlePointerLeave.bind(this));
        this.canvas.removeEventListener('dragover', this.handleDragOver.bind(this));
        this.canvas.removeEventListener('drop', this.handleDrop.bind(this));
    }

    getCanvasSize() {
        return [this.canvas.width, this.canvas.height];
    }
    
    getCanvasPosition(event) {
/*
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor(event.clientX - rect.left);
        const y = Math.floor(event.clientY - rect.top);
        return [x, y];
*/
        const p = convertPointFromPageToNode(this.canvas, event.pageX, event.pageY);
        return [Math.floor(p.x), Math.floor(p.y)];
    }
    
    handlePointerDown(event) {
        const p = this.getCanvasPosition(event);
        
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
        this.pointerCursor = this.getCanvasPosition(event);
        if (this.draggingLayer) {
            this.draggingLayer.pointerMove(this.getCanvasPosition(event), this.payload); // 念のため別の実体
            this.redrawIfRequired();
        } else {
            for (let i = this.layers.length - 1; i >= 0; i--) {
                const layer = this.layers[i];
                layer.pointerHover(this.getCanvasPosition(event));
            }
            this.redrawIfRequired();
        }
    }
    
    handlePointerUp(event) {
        if (this.draggingLayer) {
            this.draggingLayer.pointerUp(this.getCanvasPosition(event), this.payload);
            this.draggingLayer = null;
            this.redrawIfRequired();
        }
    }
      
    handlePointerLeave(event) {
        this.pointerCursor = [-1,-1];
        if (this.draggingLayer) {
            this.handlepointerUp(event);
            this.redrawIfRequired();
            this.canvas.releasePointerCapture(event.pointerId);
        }
    }

    handleDragOver(event) {
        event.preventDefault();
    }

    handleDrop(event) {
        this.pointerCursor = this.getCanvasPosition(event);
        event.preventDefault();  // ブラウザのデフォルトの画像表示処理をOFF
        var file = event.dataTransfer.files[0];

        if (!file.type.match(/^image\/(png|jpeg|gif)$/)) return;

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
      
    render() {
        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            layer.render(this.context);
        }
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
        layer.hint = this.onHint;
        this.layers.push(layer);
    }
    
    isPointerOnCanvas(m) {
        const rect = this.canvas.getBoundingClientRect();
        const f = 0 <= m[0] && m[0] <= rect.width && 0 <= m[1] && m[1] <= rect.height;
        return f;
    }

    setCanvasSize(w, h) {
        this.canvas.width = w;
        this.canvas.height = h;
    }
}


let pointerSequence = { // mixin
    pointerDown(p, payload) {
        this.pointerHandler = this.pointer(p, payload);
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
}

export class Layer {
    constructor() {}

    getCanvasSize() {return [this.canvas.width, this.canvas.height];}
    redraw() { this.redrawRequired = true; }

    pointerHover(point) {}
    accepts(point) { return null; }
    unfocus() {}
    pointerDown(point, payload) { console.log("A");}
    pointerMove(point, payload) {}
    pointerUp(point, payload) {}
    render(ctx) {}
    dropped(image, position) { return false; }
}