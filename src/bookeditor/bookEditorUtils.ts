import { LayeredCanvas, Paper } from '../lib/layeredCanvas/system/layeredCanvas';
import { FloorLayer } from '../lib/layeredCanvas/layers/floorLayer';
import { SampleLayer } from '../lib/layeredCanvas/layers/SampleLayer';
import { initializeKeyCache, keyDownFlags } from '../lib/layeredCanvas/system/keyCache';
import type { Page } from './book';
import { ArrayLayer } from '../lib/layeredCanvas/layers/arrayLayer';
import { PaperRendererLayer } from '../lib/layeredCanvas/layers/paperRendererLayer';

export function buildBookEditor(
  canvas: HTMLCanvasElement, 
  pages: Page[],
  onHint: (p: [number, number], s: String) => void,
  onUndo: () => void,
  onRedo: () => void) {

  const layeredCanvas = new LayeredCanvas(
    canvas, 
    onHint,
    true);

  const floorLayer = new FloorLayer(layeredCanvas.viewport);
  layeredCanvas.rootPaper.addLayer(floorLayer);

  let papers: Paper[] = [];
  // pages.push(pages[0]);
  for (const page of pages) {
    const paper = new Paper(page.paperSize);
    const paperRendererLayer = new PaperRendererLayer();
    paperRendererLayer.setFrameTree(page.frameTree);
    paperRendererLayer.setBubbles(page.bubbles);
    paper.addLayer(paperRendererLayer);
    papers.push(paper);
  }
  const arrayLayer = new ArrayLayer(papers, 100);
  layeredCanvas.rootPaper.addLayer(arrayLayer);

  // layeredCanvas.rootPaper.addLayer(new SampleLayer());

  initializeKeyCache(canvas, (code: string) => {
    if (code =="KeyZ" && (keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"]) && (keyDownFlags["ShiftLeft"] || keyDownFlags["ShiftRight"])) {
      console.log("paper ctrl+shift+z")
      onRedo();
      return false;
    }
    if (code =="KeyZ" && (keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"])) {
      console.log("paper ctrl+z")
      onUndo();
      return false;
    }
    return code === "AltLeft" || code === "AltRight" ||
        code === "ControlLeft" || code === "ControlRight" ||
        code === "ShiftLeft" || code === "ShiftRight" ||
        code === "KeyQ" || code === "KeyW" || code === "KeyS" || 
        code === "KeyF" || code === "KeyR" || code === "KeyD" || code === "KeyB" ||
        code === "KeyT" || code === "KeyY" || code === "KeyE" ||
        code === "Space";
  });

  return layeredCanvas;
}

