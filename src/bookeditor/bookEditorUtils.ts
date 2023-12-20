import { LayeredCanvas, Paper } from '../lib/layeredCanvas/system/layeredCanvas';
import { FloorLayer } from '../lib/layeredCanvas/layers/floorLayer';
import { SampleLayer } from '../lib/layeredCanvas/layers/SampleLayer';
import { ArrayLayer } from '../lib/layeredCanvas/layers/arrayLayer';
import { FrameLayer } from '../lib/layeredCanvas/layers/frameLayer';
import { initializeKeyCache, keyDownFlags } from '../lib/layeredCanvas/system/keyCache';
import type { Page } from './book';
import { PaperRendererLayer } from '../lib/layeredCanvas/layers/paperRendererLayer';
import type { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';

export interface BookOperators {
  commit: () => void;
  revert: () => void;
  undo: () => void;
  redo: () => void;
  modalGenerate: (frameElement: FrameElement) => void;
  modalScribble: (frameElement: FrameElement) => void;
  insert: (frameElement: FrameElement) => void;
  splice: (frameElement: FrameElement) => void;
  hint: (p: [number, number], s: String) => void;
}

export function buildBookEditor(
  canvas: HTMLCanvasElement, 
  pages: Page[],
  operators: BookOperators) {

  const layeredCanvas = new LayeredCanvas(canvas,operators.hint,true);

  const floorLayer = new FloorLayer(layeredCanvas.viewport);
  layeredCanvas.rootPaper.addLayer(floorLayer);

  let papers: Paper[] = [];
  // pages.push(pages[0]);
  for (const page of pages) {
    papers.push(buildPaper(page, operators));
  }
  const arrayLayer = new ArrayLayer(papers, 100);
  layeredCanvas.rootPaper.addLayer(arrayLayer);

  // layeredCanvas.rootPaper.addLayer(new SampleLayer());

  initializeKeyCache(canvas, (code: string) => {
    if (code =="KeyZ" && (keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"]) && (keyDownFlags["ShiftLeft"] || keyDownFlags["ShiftRight"])) {
      console.log("paper ctrl+shift+z")
      operators.redo();
      return false;
    }
    if (code =="KeyZ" && (keyDownFlags["ControlLeft"] || keyDownFlags["ControlRight"])) {
      console.log("paper ctrl+z")
      operators.undo();
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

function buildPaper(page: Page, {commit, revert, modalGenerate, modalScribble, insert, splice}: BookOperators) {
  const paper = new Paper(page.paperSize);

  const paperRendererLayer = new PaperRendererLayer();
  paperRendererLayer.setFrameTree(page.frameTree);
  paperRendererLayer.setBubbles(page.bubbles);
  paper.addLayer(paperRendererLayer);

  const frameLayer = new FrameLayer(
    paperRendererLayer,
    page.frameTree,
    commit,
    revert,
    modalGenerate,
    modalScribble,
    insert,
    splice);
  paper.addLayer(frameLayer);

  return paper;
}

