import { LayeredCanvas } from "./layeredCanvas.js";
import { FrameLayer } from "./frameLayer.js";
import { FrameElement } from "./frameTree.js";

export function drawTemplate(canvas, markUp) {
    console.log("drawTemplate");
    canvas.width = 140;
    canvas.height = 198;

    const frameTree = FrameElement.compile(markUp);

    const layeredCanvas = new LayeredCanvas(canvas);
    const frameLayer = new FrameLayer(frameTree);
    layeredCanvas.addLayer(frameLayer);
    layeredCanvas.redraw();
}
