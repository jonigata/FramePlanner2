import { LayeredCanvas, Paper, Viewport } from '../system/layeredCanvas';
import { FloorLayer } from '../layers/floorLayer';
import { ArrayLayer } from '../layers/arrayLayer';
import { ViewerLayer } from '../layers/viewerLayer';
import type { Book, Page, WrapMode, ReadingDirection } from '../../book/book';
import { PaperRendererLayer } from '../layers/paperRendererLayer';
import { FocusKeeper } from './focusKeeper';
import type { Layout } from '../dataModels/frameTree';
import { Bubble } from '../dataModels/bubble';

export { readEnvelope } from '../../book/envelope';
export { initPaperJs } from './draw/bubbleGraphic';
export type { Book, Page, WrapMode, ReadingDirection };

export class BookRenderer {
  constructor(public arrayLayer: ArrayLayer, public layeredCanvas: LayeredCanvas, public focusKeeper: FocusKeeper, public marks: boolean[]) {}
  cleanup() {
    this.layeredCanvas.cleanup();
  }

  focusToPage(index: number, pageScale: number = 1) {
    const viewport = this.layeredCanvas.viewport;
    const [cw, ch] = viewport.getCanvasSize();
    const paper = this.arrayLayer.array.papers[index];
    const [pw, ph] = paper.paper.size;
    const scale = Math.min(Math.max(1, cw) / pw, Math.max(1, ch) / ph) * pageScale;
    const p = paper.center;
    viewport.scale = scale;
    viewport.translate = [-p[0] * scale, -p[1] * scale];
    viewport.dirty = true;
    this.layeredCanvas.redraw();
  }

  getScale() {
    return this.layeredCanvas.viewport.scale;
  }
}

export function buildBookRenderer(canvas: HTMLCanvasElement, book: Book, startIndex: number = 0, length: number = -1): BookRenderer {
  console.log("Building renderer...");
  const viewport = new Viewport(canvas, () => {});
  const focusKeeper = new FocusKeeper();
  const layeredCanvas = new LayeredCanvas(viewport, true);

  const floorLayer = new FloorLayer(layeredCanvas.viewport, () => {}, focusKeeper);
  layeredCanvas.rootPaper.addLayer(floorLayer);

  let papers: Paper[] = [];
  // pages.push(pages[0]);
  const endIndex = length < 0 ? book.pages.length : startIndex + length;
  for (let i = startIndex; i < endIndex; i++) {
    const page = book.pages[i];
    for (const bubble of page.bubbles) {
      bubble.pageNumber = i;
    }
    papers.push(buildPaper(page, focusKeeper));
  }
  const direction = getDirectionFromReadingDirection(book.direction);
  const {fold, gapX, gapY} = getFoldAndGapFromWrapMode(book.wrapMode);
  const marks: boolean[] = [];
  const arrayLayer = new ArrayLayer(
    papers, marks, fold, gapX, gapY, direction,
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {});
  layeredCanvas.rootPaper.addLayer(arrayLayer);

  layeredCanvas.mode = 'viewer';

  return new BookRenderer(arrayLayer, layeredCanvas, focusKeeper, marks);
}

export function destroyBookRenderer(renderer: BookRenderer) {
  renderer.cleanup();
}

function buildPaper(page: Page, focusKeeper: FocusKeeper): Paper {
  const paper = new Paper(page.paperSize, false);

  // renderer
  const paperRendererLayer = new PaperRendererLayer(true);
  paperRendererLayer.setFrameTree(page.frameTree);
  paperRendererLayer.setBubbles(page.bubbles);
  paper.addLayer(paperRendererLayer);

  // viewerLayer
  const viewerLayer = new ViewerLayer(
    page.frameTree, 
    page.bubbles,
    (target: Layout | Bubble | null)=>{
      console.log(target);
    }, 
    focusKeeper)
  paper.addLayer(viewerLayer);

  // frame
  page.frameTree.bgColor = page.paperColor;
  page.frameTree.borderColor = page.frameColor;
  page.frameTree.borderWidth = page.frameWidth;

  return paper;
}

function getFoldAndGapFromWrapMode(wrapMode: WrapMode): { fold: number, gapX: number, gapY: number } {
  switch (wrapMode) {
    case "none":
      return { fold: 0, gapX: 100, gapY: 0 };
    case "two-pages":
      return { fold: 2, gapX: 100, gapY: 200 };
    case "one-page":
      return { fold: 1, gapX: 0, gapY: 0 };
  }
}

function getDirectionFromReadingDirection(readingDirection: ReadingDirection): number {
  switch (readingDirection) {
    case "left-to-right":
      return 1;
    case "right-to-left":
      return -1;
  }
}
