import { LayeredCanvas, Paper, Viewport } from '../lib/layeredCanvas/system/layeredCanvas';
import { FloorLayer } from '../lib/layeredCanvas/layers/floorLayer';
// import { SampleLayer } from '../lib/layeredCanvas/layers/SampleLayer';
import { ArrayLayer } from '../lib/layeredCanvas/layers/arrayLayer';
import { FrameLayer } from '../lib/layeredCanvas/layers/frameLayer';
import { BubbleLayer, DefaultBubbleSlot } from '../lib/layeredCanvas/layers/bubbleLayer';
import { UndoLayer } from '../lib/layeredCanvas/layers/undoLayer';
import { initializeKeyCache, keyDownFlags } from '../lib/layeredCanvas/system/keyCache';
import type { Book, Page, BookOperators } from './book';
import { PaperRendererLayer } from '../lib/layeredCanvas/layers/paperRendererLayer';
import type { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';
import type { Bubble } from '../lib/layeredCanvas/dataModels/bubble';

export function buildBookEditor(
  viewport: Viewport,
  book: Book,
  editor: BookOperators,
  defaultBubbleSlot: DefaultBubbleSlot) {

  const layeredCanvas = new LayeredCanvas(viewport, true);

  const floorLayer = new FloorLayer(layeredCanvas.viewport, editor.viewportChanged);
  layeredCanvas.rootPaper.addLayer(floorLayer);

  let papers: Paper[] = [];
  // pages.push(pages[0]);
  let pageNumber = 0;
  for (const page of book.pages) {
    for (const bubble of page.bubbles) {
      bubble.pageNumber = pageNumber;
    }
    papers.push(buildPaper(layeredCanvas, book, page, editor, defaultBubbleSlot));
    pageNumber++;
  }
  const arrayLayer = new ArrayLayer(papers, 100, editor.insertPage, editor.deletePage);
  layeredCanvas.rootPaper.addLayer(arrayLayer);

  layeredCanvas.takeOver();

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

  return { arrayLayer, layeredCanvas};
}

function buildPaper(layeredCanvas: LayeredCanvas, book: Book, page: Page, {commit, revert, undo, redo, modalGenerate, modalScribble, insert, splice, focusBubble }: BookOperators, defaultBubbleSlot: DefaultBubbleSlot) {
  const paper = new Paper(page.paperSize, false);

  // undo
  const undoLayer = new UndoLayer(() => undo(), () => redo());
  paper.addLayer(undoLayer);

  // renderer
  const paperRendererLayer = new PaperRendererLayer();
  paperRendererLayer.setFrameTree(page.frameTree);
  paperRendererLayer.setBubbles(page.bubbles);
  paper.addLayer(paperRendererLayer);

  // frame
  page.frameTree.bgColor = page.paperColor;
  page.frameTree.borderColor = page.frameColor;
  page.frameTree.borderWidth = page.frameWidth;
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
    defaultBubbleSlot,
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
    () => { revert(); },
    (bubble: Bubble) => { potentialCrossPage(layeredCanvas, book, page, bubble); });
  paper.addLayer(bubbleLayer);

  return paper;
}

function potentialCrossPage(layeredCanvas: LayeredCanvas, book: Book, page: Page, b: Bubble): void {
  console.log("potentialCrossPage");
  const arrayLayer = layeredCanvas.rootPaper.findLayer(ArrayLayer);
  const currentPageIndex = book.pages.findIndex(p => p.id === page.id);
  const p = b.center; // page coordinate
  const q = arrayLayer.array.childPositionToParentPosition(currentPageIndex, p); // array coordinate
  const index = arrayLayer.array.findNearestPaperIndex(q);
  if (index !== currentPageIndex) {
    console.log("cross page");
    book.pages[currentPageIndex].bubbles.splice(
      book.pages[currentPageIndex].bubbles.findIndex(e => e.uuid === b.uuid), 1);
    book.pages[index].bubbles.push(b);
    b.pageNumber = index;
    b.center = arrayLayer.array.parentPositionToChildPosition(index, q);
    b.parent = null;
    book.pages[currentPageIndex].bubbles.forEach(e => {
      if (e.parent === b.uuid) {
        e.parent = null;
      }
    });
  }
}