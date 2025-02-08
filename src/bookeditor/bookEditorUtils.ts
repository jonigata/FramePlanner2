import { LayeredCanvas, Paper, Viewport } from '../lib/layeredCanvas/system/layeredCanvas';
import { FloorLayer } from '../lib/layeredCanvas/layers/floorLayer';
// import { SampleLayer } from '../lib/layeredCanvas/layers/SampleLayer';
import { ArrayLayer } from '../lib/layeredCanvas/layers/arrayLayer';
import { FrameLayer } from '../lib/layeredCanvas/layers/frameLayer';
// import { ClickableLayer } from '../lib/layeredCanvas/layers/clickableLayer';
import { BubbleLayer, DefaultBubbleSlot } from '../lib/layeredCanvas/layers/bubbleLayer';
import { UndoLayer } from '../lib/layeredCanvas/layers/undoLayer';
import { InlinePainterLayer } from '../lib/layeredCanvas/layers/inlinePainterLayer';
import { initializeKeyCache } from '../lib/layeredCanvas/system/keyCache';
import type { Book, Page, BookOperators, WrapMode, ReadingDirection } from '../lib/book/book';
import { PaperRendererLayer } from '../lib/layeredCanvas/layers/paperRendererLayer';
import type { FrameElement, Layout, Border } from '../lib/layeredCanvas/dataModels/frameTree';
import type { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
import { trapezoidCenter } from '../lib/layeredCanvas/tools/geometry/trapezoid';
import { FocusKeeper } from '../lib/layeredCanvas/tools/focusKeeper';

export function buildBookEditor(
  viewport: Viewport,
  book: Book,
  editor: BookOperators,
  defaultBubbleSlot: DefaultBubbleSlot) {

  const focusKeeper = new FocusKeeper();

  const layeredCanvas = new LayeredCanvas(viewport, true);

  const floorLayer = new FloorLayer(layeredCanvas.viewport, editor.viewportChanged, focusKeeper);
  layeredCanvas.rootPaper.addLayer(floorLayer);

  let papers: Paper[] = [];
  // pages.push(pages[0]);
  let pageNumber = 0;
  for (const page of book.pages) {
    for (const bubble of page.bubbles) {
      bubble.pageNumber = pageNumber;
    }
    papers.push(buildPaper(layeredCanvas, focusKeeper, book, page, editor, defaultBubbleSlot));
    pageNumber++;
  }
  const direction = getDirectionFromReadingDirection(book.direction);
  const {fold, gapX, gapY} = getFoldAndGapFromWrapMode(book.wrapMode);
  const marks: boolean[] = [];
  const arrayLayer = new ArrayLayer(
    papers, marks, fold, gapX, gapY, direction,
    editor.insertPage,
    editor.deletePage,
    editor.movePages,
    editor.copyPageToClipboard,
    editor.batchImaging,
    editor.editBubbles,
    editor.tweak);
  layeredCanvas.rootPaper.addLayer(arrayLayer);

  layeredCanvas.takeOver();

  // layeredCanvas.rootPaper.addLayer(new SampleLayer());

  initializeKeyCache(viewport.canvas, (code: string) => {
    return code === "AltLeft" || code === "AltRight" ||
        code === "ControlLeft" || code === "ControlRight" ||
        code === "ShiftLeft" || code === "ShiftRight" ||
        code === "KeyQ" || code === "KeyW" || code === "KeyS" || 
        code === "KeyF" || code === "KeyG" || code === "KeyR" || code === "KeyD" || code === "KeyB" ||
        code === "KeyT" || code === "KeyY" || code === "KeyE" || code === "KeyZ" ||
        code === "Space";
  });

  return { arrayLayer, layeredCanvas, focusKeeper, marks };
}

export function getFoldAndGapFromWrapMode(wrapMode: WrapMode): { fold: number, gapX: number, gapY: number } {
  switch (wrapMode) {
    case "none":
      return { fold: 0, gapX: 100, gapY: 0 };
    case "two-pages":
      return { fold: 2, gapX: 100, gapY: 200 };
    case "one-page":
      return { fold: 1, gapX: 0, gapY: 0 };
  }
}

export function getDirectionFromReadingDirection(readingDirection: ReadingDirection): number {
  switch (readingDirection) {
    case "left-to-right":
      return 1;
    case "right-to-left":
      return -1;
  }
}

function buildPaper(layeredCanvas: LayeredCanvas, focusKeeper: FocusKeeper, book: Book, page: Page, {commit, revert, undo, redo, shift, unshift, swap, insert, focusFrame, focusBubble, chase }: BookOperators, defaultBubbleSlot: DefaultBubbleSlot) {
  const paper = new Paper(page.paperSize, false);

  // undo
  const undoLayer = new UndoLayer(() => undo(), () => redo());
  paper.addLayer(undoLayer);

  // renderer
  const paperRendererLayer = new PaperRendererLayer(true);
  paperRendererLayer.setFrameTree(page.frameTree);
  paperRendererLayer.setBubbles(page.bubbles);
  paper.addLayer(paperRendererLayer);

  // frame
  page.frameTree.bgColor = page.paperColor;
  page.frameTree.borderColor = page.frameColor;
  page.frameTree.borderWidth = page.frameWidth;
  const frameLayer = new FrameLayer(
    paperRendererLayer,
    focusKeeper,
    page.frameTree,
    (l: Layout | null) => { 
      if (l) {
        focusFrame(page, l.element, trapezoidCenter(l.corners));
      } else {
        focusFrame(page, null, null);
      }
    },
    () => { commit(null); },
    () => { revert(); },
    (e: FrameElement) => { shift(page, e); },
    (e: FrameElement) => { unshift(page, e); },
    (e1: FrameElement, e2: FrameElement) => { swap(page, e1, e2); },
    (e: Border) => { insert(page, e) });
  paper.addLayer(frameLayer);

  // const clickableLayer = new ClickableLayer(page.frameTree, (layout: Layout | null) => {
  //   console.log('Clicked layout:', layout);
  //   if (layout) {
  //     focusFrame(page, layout.element, trapezoidCenter(layout.corners));
  //   } else {
  //     focusFrame(page, null, null);
  //   }
  // }, focusKeeper);
  // paper.addLayer(clickableLayer);

  // bubbles
  const bubbleLayer = new BubbleLayer(
    layeredCanvas.viewport,
    focusKeeper,
    paperRendererLayer,
    defaultBubbleSlot,
    page.bubbles,
    2,
    (bubble: Bubble | null) => { 
      focusBubble(page, bubble);
    },
    (weak?: boolean) => { commit(weak ? 'bubble' : null); },
    () => { revert(); },
    (bubble: Bubble) => { potentialCrossPage(layeredCanvas, book, page, bubble); });
  paper.addLayer(bubbleLayer);

  // inline painter
  const inlinePainterLayer = new InlinePainterLayer(frameLayer, chase);
  paper.addLayer(inlinePainterLayer);

  return paper;
}

function potentialCrossPage(layeredCanvas: LayeredCanvas, book: Book, page: Page, b: Bubble): void {
  const arrayLayer = layeredCanvas.rootPaper.findLayer(ArrayLayer)!;
  const currentPageIndex = book.pages.findIndex(p => p.id === page.id);
  const paperSize = book.pages[currentPageIndex].paperSize;
  const p = b.getPhysicalCenter(paperSize); // paper coordinate
  const q = arrayLayer.array.childPositionToParentPosition(currentPageIndex, p); // array coordinate
  const index = arrayLayer.array.findNearestPaperIndex(q);
  if (index !== currentPageIndex) {
    book.pages[currentPageIndex].bubbles.splice(
      book.pages[currentPageIndex].bubbles.findIndex(e => e.uuid === b.uuid), 1);
    book.pages[index].bubbles.push(b);
    b.pageNumber = index;
    b.setPhysicalCenter(book.pages[index].paperSize, arrayLayer.array.parentPositionToChildPosition(index, q));
    b.parent = null;
    book.pages[currentPageIndex].bubbles.forEach(e => {
      if (e.parent === b.uuid) {
        e.parent = null;
      }
    });
    layeredCanvas.redraw();
  }
}