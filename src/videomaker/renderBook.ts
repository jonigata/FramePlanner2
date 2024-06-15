import { LayeredCanvas, Paper, Viewport } from '../lib/layeredCanvas/system/layeredCanvas';
import { ArrayLayer } from '../lib/layeredCanvas/layers/arrayLayer';
import { type Book, type Page, type WrapMode, type ReadingDirection, collectBookContents } from '../bookeditor/book';
import { PaperRendererLayer } from '../lib/layeredCanvas/layers/paperRendererLayer';
import { trapezoidBoundingRect, trapezoidCenter } from '../lib/layeredCanvas/tools/geometry/trapezoid';
import type { Layout } from '../lib/layeredCanvas/dataModels/frameTree';

export function buildBookRenderer(canvas: HTMLCanvasElement, book: Book) {
  const viewport = new Viewport(canvas, () => {});
  const layeredCanvas = new LayeredCanvas(viewport, false);

  let papers: Paper[] = [];
  let pageNumber = 0;
  for (const page of book.pages) {
    console.log([...page.bubbles]);
    papers.push(buildPaper(page));
    pageNumber++;
  }
  const direction = getDirectionFromReadingDirection(book.direction);
  const {fold, gapX, gapY} = getFoldAndGapFromWrapMode(book.wrapMode);
  const arrayLayer = new ArrayLayer(
    papers, fold, gapX, gapY, direction,
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {});
  layeredCanvas.rootPaper.addLayer(arrayLayer);

  layeredCanvas.mode = "video";

  return { arrayLayer, layeredCanvas};
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

function buildPaper(page: Page) {
  const paper = new Paper(page.paperSize, false);

  // renderer
  const paperRendererLayer = new PaperRendererLayer();
  paperRendererLayer.setFrameTree(page.frameTree);
  paperRendererLayer.setBubbles(page.bubbles);
  paper.addLayer(paperRendererLayer);
  console.log([...page.bubbles]);

  return paper;
}

export type DisplayProgramEntry = {
  pageNumber: number;
  position: [number, number],
  scale: number,
  residenceTime: number, // standardWaitからの相対
  layout: Layout;
}

export function makeDisplayProgram(book: Book, viewportSize: [number, number], old: DisplayProgramEntry[]): DisplayProgramEntry[] {
  const seq = collectBookContents(book);
  const result: DisplayProgramEntry[] = [];
  let i = 0;
  for (const slot of seq.slots) {
    const { layout, page, pageNumber } = slot;
    const rect = trapezoidBoundingRect(layout.corners);
    const position = trapezoidCenter(layout.corners);
    const scale = Math.min(viewportSize[0] / rect[2], viewportSize[1] / rect[3]);    
    let residenceTime = 0;
    if (old) {
      residenceTime = old[i].residenceTime;
    }
    result.push({ pageNumber, position, scale, residenceTime, layout });
  }
  return result;
}
