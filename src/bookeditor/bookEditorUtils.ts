import { LayeredCanvas, Paper, Viewport } from '../lib/layeredCanvas/system/layeredCanvas';
import { FloorLayer } from '../lib/layeredCanvas/layers/floorLayer';
// import { SampleLayer } from '../lib/layeredCanvas/layers/SampleLayer';
import { ArrayLayer } from '../lib/layeredCanvas/layers/arrayLayer';
import { FrameLayer } from '../lib/layeredCanvas/layers/frameLayer';
import { BubbleLayer } from '../lib/layeredCanvas/layers/bubbleLayer';
import { UndoLayer } from '../lib/layeredCanvas/layers/undoLayer';
import { initializeKeyCache, keyDownFlags } from '../lib/layeredCanvas/system/keyCache';
import type { Page, BookOperators } from './book';
import { PaperRendererLayer } from '../lib/layeredCanvas/layers/paperRendererLayer';
import type { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';
import type { Bubble } from '../lib/layeredCanvas/dataModels/bubble';


export function buildBookEditor(
  viewport: Viewport,
  pages: Page[],
  editor: BookOperators) {

  const layeredCanvas = new LayeredCanvas(viewport, true);

  const floorLayer = new FloorLayer(layeredCanvas.viewport, editor.viewportChanged);
  layeredCanvas.rootPaper.addLayer(floorLayer);

  let papers: Paper[] = [];
  // pages.push(pages[0]);
  for (const page of pages) {
    papers.push(buildPaper(layeredCanvas, page, editor));
  }
  const arrayLayer = new ArrayLayer(papers, 100, editor.insertPage, editor.deletePage);
  layeredCanvas.rootPaper.addLayer(arrayLayer);

  // layeredCanvas.rootPaper.addLayer(new SampleLayer());

  initializeKeyCache(viewport.canvas, (code: string) => {
    return code === "AltLeft" || code === "AltRight" ||
        code === "ControlLeft" || code === "ControlRight" ||
        code === "ShiftLeft" || code === "ShiftRight" ||
        code === "KeyQ" || code === "KeyW" || code === "KeyS" || 
        code === "KeyF" || code === "KeyR" || code === "KeyD" || code === "KeyB" ||
        code === "KeyT" || code === "KeyY" || code === "KeyE" || code === "KeyZ" ||
        code === "Space";
  });

  return layeredCanvas;
}

function buildPaper(layeredCanvas: LayeredCanvas, page: Page, {commit, revert, undo, redo, modalGenerate, modalScribble, insert, splice, focusBubble}: BookOperators) {
  const paper = new Paper(page.paperSize);

  // undo
  const undoLayer = new UndoLayer(() => undo(), () => redo());
  paper.addLayer(undoLayer);

  // renderer
  const paperRendererLayer = new PaperRendererLayer();
  paperRendererLayer.setFrameTree(page.frameTree);
  paperRendererLayer.setBubbles(page.bubbles);
  paper.addLayer(paperRendererLayer);

  // frame
  const frameLayer = new FrameLayer(
    paperRendererLayer,
    page.frameTree,
    () => { commit(null); },
    () => { revert(); },
    (e: FrameElement) => { modalGenerate(page, e); },
    (e: FrameElement) => { modalScribble(page, e); },
    (e: FrameElement) => { insert(page, e); },
    (e: FrameElement) => { splice(page, e); });
  paper.addLayer(frameLayer);

  // bubbles
  const bubbleLayer = new BubbleLayer(
    layeredCanvas.viewport,
    paperRendererLayer,
    page.bubbles,
    (bubble: Bubble) => { 
      if (bubble) {
        const cp = layeredCanvas.paperPositionToCanvasPosition(paper, bubble.center);
        focusBubble(page, bubble, cp);
      } else {
        focusBubble(page, null, null);
      }
    },
    () => { commit(null); },
    () => { revert(); });
  paper.addLayer(bubbleLayer);

  return paper;
}

