import { LayeredCanvas, Paper, Viewport } from '../lib/layeredCanvas/system/layeredCanvas';
import { ArrayLayer } from '../lib/layeredCanvas/layers/arrayLayer';
import { type Book, type Page, type WrapMode, type ReadingDirection, collectBookContents } from '../lib/book/book';
import { PaperRendererLayer } from '../lib/layeredCanvas/layers/paperRendererLayer';
import { trapezoidBoundingRect, trapezoidCenter } from '../lib/layeredCanvas/tools/geometry/trapezoid';
import type { Layout } from '../lib/layeredCanvas/dataModels/frameTree';
import type { Bubble } from '../lib/layeredCanvas/dataModels/bubble';

export function buildBookRenderer(canvas: HTMLCanvasElement, book: Book) {
  const viewport = new Viewport(canvas, () => {});
  const layeredCanvas = new LayeredCanvas(viewport, false);

  let papers: Paper[] = [];
  let pageNumber = 0;
  for (const page of book.pages) {
    papers.push(buildPaper(page));
    pageNumber++;
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

  layeredCanvas.mode = "video";

  return {arrayLayer, layeredCanvas};
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

  return paper;
}

export type DisplayProgramEntry = {
  pageNumber: number;
  position: [number, number],
  scale: number,
  residenceTime: number, // standardWaitからの相対
  layout: Layout;
  bubbles: Bubble[];
}

export function makeDisplayProgram(book: Book, viewportSize: [number, number], old: DisplayProgramEntry[]): DisplayProgramEntry[] {
  const seq = collectBookContents(book);
  const result: DisplayProgramEntry[] = [];
  for (let i = 0; i < seq.slots.length; i++) {
    const slot = seq.slots[i];
    const content = seq.contents[i];

    const { layout, pageNumber } = slot;
    const { bubbles } = content;
    const rect = trapezoidBoundingRect(layout.corners);
    const position = trapezoidCenter(layout.corners);
    const scale = Math.min(viewportSize[0] / rect[2], viewportSize[1] / rect[3]);    
    let residenceTime = layout.element.residenceTime;
    if (old) {
      residenceTime = old[i].residenceTime;
    }
    result.push({ pageNumber, position, scale, residenceTime, layout, bubbles });
  }
  return result;
}

export function reflectDisplayProgram(book: Book, program: DisplayProgramEntry[]): void {
  const seq = collectBookContents(book);
  for (let i = 0; i < seq.slots.length; i++) {
    const slot = seq.slots[i];
    const { layout } = slot;
    layout.element.residenceTime = program[i].residenceTime;
  }
}