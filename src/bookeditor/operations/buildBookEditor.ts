import { LayeredCanvas, Paper, Viewport } from '../../lib/layeredCanvas/system/layeredCanvas';
import { FloorLayer } from '../../lib/layeredCanvas/layers/floorLayer';
// import { SampleLayer } from '../../lib/layeredCanvas/layers/SampleLayer';
import { ArrayLayer } from '../../lib/layeredCanvas/layers/arrayLayer';
import { FrameLayer } from '../../lib/layeredCanvas/layers/frameLayer';
import { ViewerLayer } from '../../lib/layeredCanvas/layers/viewerLayer';
import { BubbleLayer, DefaultBubbleSlot } from '../../lib/layeredCanvas/layers/bubbleLayer';
import { UndoLayer } from '../../lib/layeredCanvas/layers/undoLayer';
import { InlinePainterLayer } from '../../lib/layeredCanvas/layers/inlinePainterLayer';
import { initializeKeyCache } from '../../lib/layeredCanvas/system/keyCache';
import type { Book, Page, BookOperators, WrapMode, ReadingDirection } from '../../lib/book/book';
import { PaperRendererLayer } from '../../lib/layeredCanvas/layers/paperRendererLayer';
import type { FrameElement, Layout, Border } from '../../lib/layeredCanvas/dataModels/frameTree';
import { Bubble } from '../../lib/layeredCanvas/dataModels/bubble';
import { trapezoidCenter } from '../../lib/layeredCanvas/tools/geometry/trapezoid';
import { FocusKeeper } from '../../lib/layeredCanvas/tools/focusKeeper';

export function buildBookEditor(
  viewport: Viewport,
  book: Book,
  editor: BookOperators,
) {
  const focusKeeper = new FocusKeeper();
  const defaultBubbleSlot = new DefaultBubbleSlot(new Bubble());

  const layeredCanvas = new LayeredCanvas(viewport, true);

  const floorLayer = new FloorLayer(
    layeredCanvas.viewport,
    editor.viewportChanged.bind(editor),
    editor.rescueResidual.bind(editor),
    focusKeeper
  );
  layeredCanvas.rootPaper.addLayer(floorLayer);

  let papers: Paper[] = [];
  let pageNumber = 0;
  for (const page of book.pages) {
    for (const bubble of page.bubbles) {
      bubble.pageNumber = pageNumber;
    }
    papers.push(buildPaper(layeredCanvas, focusKeeper, book, page, editor, defaultBubbleSlot));
    pageNumber++;
  }
  const direction = getDirectionFromReadingDirection(book.direction);
  const { fold, gapX, gapY } = getFoldAndGapFromWrapMode(book.wrapMode);
  const marks: boolean[] = [];
  const arrayLayer = new ArrayLayer(
    papers,
    marks,
    fold,
    gapX,
    gapY,
    direction,
    editor.insertPage.bind(editor),
    editor.deletePage.bind(editor),
    editor.movePages.bind(editor),
    editor.duplicatePages.bind(editor),
    editor.copyPageToClipboard.bind(editor),
    editor.batchImaging.bind(editor),
    editor.editBubbles.bind(editor),
    editor.tweak.bind(editor)
  );
  layeredCanvas.rootPaper.addLayer(arrayLayer);

  layeredCanvas.takeOver();

  initializeKeyCache(viewport.canvas, (code: string) => {
    return (
      code === 'AltLeft' ||
      code === 'AltRight' ||
      code === 'ControlLeft' ||
      code === 'ControlRight' ||
      code === 'ShiftLeft' ||
      code === 'ShiftRight' ||
      code === 'KeyQ' ||
      code === 'KeyW' ||
      code === 'KeyS' ||
      code === 'KeyF' ||
      code === 'KeyG' ||
      code === 'KeyR' ||
      code === 'KeyD' ||
      code === 'KeyB' ||
      code === 'KeyT' ||
      code === 'KeyY' ||
      code === 'KeyE' ||
      code === 'KeyZ' ||
      code === 'Space'
    );
  });

  return { arrayLayer, layeredCanvas, focusKeeper, marks, defaultBubbleSlot };
}

export function getFoldAndGapFromWrapMode(wrapMode: WrapMode): { fold: number; gapX: number; gapY: number } {
  switch (wrapMode) {
    case 'none':
      return { fold: 0, gapX: 250, gapY: 0 };
    case 'two-pages':
      return { fold: 2, gapX: 250, gapY: 500 };
    case 'one-page':
      return { fold: 1, gapX: 0, gapY: 0 };
    default:
      return { fold: 0, gapX: 250, gapY: 0 };
  }
}

export function getDirectionFromReadingDirection(readingDirection: ReadingDirection): number {
  switch (readingDirection) {
    case 'left-to-right':
      return 1;
    case 'right-to-left':
      return -1;
    default:
      return 1;
  }
}

function addFrameLayer(
  paper: Paper,
  page: Page,
  paperRendererLayer: PaperRendererLayer,
  focusKeeper: FocusKeeper,
  operators: BookOperators
): FrameLayer {
  page.frameTree.bgColor = page.paperColor;
  page.frameTree.borderColor = page.frameColor;
  page.frameTree.borderWidth = page.frameWidth;

  const frameLayer = new FrameLayer(
    paperRendererLayer,
    focusKeeper,
    page.frameTree,
    (l: Layout | null) => {
      if (l) {
        operators.focusFrame(page, l.element, trapezoidCenter(l.corners));
      } else {
        operators.focusFrame(page, null, null);
      }
    },
    () => {
      operators.commit(null);
    },
    () => {
      operators.revert();
    },
    (e: FrameElement) => {
      operators.shift(page, e);
    },
    (e: FrameElement) => {
      operators.unshift(page, e);
    },
    (e1: FrameElement, e2: FrameElement) => {
      operators.swap(page, e1, e2);
    },
    (e: Border) => {
      operators.insert(page, e);
    }
  );
  paper.addLayer(frameLayer);
  return frameLayer;
}

function addViewerLayer(
  paper: Paper,
  page: Page,
  focusKeeper: FocusKeeper,
  operators: BookOperators
): ViewerLayer {
  const viewerLayer = new ViewerLayer(
    page.frameTree,
    page.bubbles,
    (layout: Layout | Bubble | null) => {
      console.log('viewer: Clicked', layout);
    },
    focusKeeper
  );
  paper.addLayer(viewerLayer);
  return viewerLayer;
}

function buildPaper(
  layeredCanvas: LayeredCanvas,
  focusKeeper: FocusKeeper,
  book: Book,
  page: Page,
  operators: BookOperators,
  defaultBubbleSlot: DefaultBubbleSlot
) {
  const paper = new Paper(page.paperSize, false);

  // undo
  const undoLayer = new UndoLayer(() => operators.undo(), () => operators.redo());
  paper.addLayer(undoLayer);

  // renderer
  const paperRendererLayer = new PaperRendererLayer(true);
  paperRendererLayer.setFrameTree(page.frameTree);
  paperRendererLayer.setBubbles(page.bubbles);
  paper.addLayer(paperRendererLayer);

  // frame and viewer
  const frameLayer = addFrameLayer(paper, page, paperRendererLayer, focusKeeper, operators);

  // bubbles
  const bubbleLayer = new BubbleLayer(
    layeredCanvas.viewport,
    focusKeeper,
    paperRendererLayer,
    defaultBubbleSlot,
    page.bubbles,
    2,
    (bubble: Bubble | null) => {
      operators.focusBubble(page, bubble);
    },
    (weak?: boolean) => {
      operators.commit(weak ? 'bubble' : null);
    },
    () => {
      operators.revert();
    },
    (bubble: Bubble) => {
      potentialCrossPage(layeredCanvas, book, page, bubble);
    }
  );
  paper.addLayer(bubbleLayer);

  // viewer (debug)
  // addViewerLayer(paper, page, focusKeeper, operators);

  // inline painter
  const inlinePainterLayer = new InlinePainterLayer(frameLayer, () => operators.chase());
  paper.addLayer(inlinePainterLayer);

  return paper;
}

function potentialCrossPage(
  layeredCanvas: LayeredCanvas,
  book: Book,
  page: Page,
  b: Bubble
): void {
  const arrayLayer = layeredCanvas.rootPaper.findLayer(ArrayLayer)!;
  const currentPageIndex = book.pages.findIndex((p: Page) => p.id === page.id);
  const paperSize = book.pages[currentPageIndex].paperSize;
  const p = b.getPhysicalCenter(paperSize); // paper coordinate
  const q = arrayLayer.array.childPositionToParentPosition(currentPageIndex, p); // array coordinate
  const index = arrayLayer.array.findNearestPaperIndex(q);
  if (index !== currentPageIndex) {
    book.pages[currentPageIndex].bubbles.splice(
      book.pages[currentPageIndex].bubbles.findIndex((e: Bubble) => e.uuid === b.uuid),
      1
    );
    book.pages[index].bubbles.push(b);
    b.pageNumber = index;
    b.setPhysicalCenter(
      book.pages[index].paperSize,
      arrayLayer.array.parentPositionToChildPosition(index, q)
    );
    b.parent = null;
    book.pages[currentPageIndex].bubbles.forEach((e: Bubble) => {
      if (e.parent === b.uuid) {
        e.parent = null;
      }
    });
    layeredCanvas.redraw();
  }
}