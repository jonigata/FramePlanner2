import { Bubble } from '../lib/layeredCanvas/dataModels/bubble';
import type { Border } from '../lib/layeredCanvas/dataModels/frameTree';
import type { Book, Page, BookOperators, HistoryTag } from '../lib/book/book';
import { DefaultBubbleSlot } from '../lib/layeredCanvas/layers/bubbleLayer';
import { collectBookContents, dealBookContents, swapBookContents } from '../lib/book/book';
import type { ArrayLayer } from '../lib/layeredCanvas/layers/arrayLayer';
import type { LayeredCanvas } from '../lib/layeredCanvas/system/layeredCanvas';
import type { Vector, Rect } from "../lib/layeredCanvas/tools/geometry/geometry";
import type { FocusKeeper } from "../lib/layeredCanvas/tools/focusKeeper";
import { FilmStackTransformer } from "../lib/layeredCanvas/dataModels/film";
import { frameExamples } from '../lib/layeredCanvas/tools/frameExamples';
import { Film } from '../lib/layeredCanvas/dataModels/film';
import { buildMedia } from '../lib/layeredCanvas/dataModels/media';
import { FrameElement, calculatePhysicalLayout, findLayoutOf, constraintLeaf } from '../lib/layeredCanvas/dataModels/frameTree';

// ストアを直接インポート
import { frameInspectorTarget } from './frameinspector/frameInspectorStore';
import { bubbleInspectorTarget } from './bubbleinspector/bubbleInspectorStore';
import { batchImagingPage } from '../generator/batchImagingStore';
import { bubbleBucketPage } from '../bubbleBucket/bubbleBucketStore';
import { pageInspectorTarget } from './pageinspector/pageInspectorStore';
import { redrawToken, viewport } from './bookStore';
import { analyticsEvent } from '../utils/analyticsEvent';
import { copyToClipboard } from '../utils/saver/copyToClipboard';
import { toolTipRequest } from '../utils/passiveToolTipStore';
import { convertPointFromNodeToPage } from '../lib/layeredCanvas/tools/geometry/convertPoint';

// 直接 operations/ から関数をインポート
import {
  insertPage, deletePage, movePages, duplicatePages,
  makeCopyPageToClipboard, makeBatchImaging, makeEditBubbles, makeTweak
} from './operations/pageOperations';
import {
  commit, revert, undoBookState, redoBookState,
  delayedCommiter
} from './operations/commitOperations';

export class BookWorkspaceOperators implements BookOperators {
  private canvas: HTMLCanvasElement;
  private book: Book;
  // ビルドされたブックエディタのリソース
  private layeredCanvas: LayeredCanvas | null = null;
  private arrayLayer: ArrayLayer | null = null;
  private focusKeeper: FocusKeeper | null = null;
  private defaultBubbleSlot: DefaultBubbleSlot | null = null;
  private marks: boolean[] = [];
  private painterChase: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    book: Book,
    painterChase: () => void
  ) {
    this.canvas = canvas;
    this.book = book;
    this.painterChase = painterChase;
  }

  /**
   * ビルドされたブックエディタのリソースを一括設定
   */
  setBuiltBook(builtBook: {
    layeredCanvas: LayeredCanvas,
    arrayLayer: ArrayLayer,
    focusKeeper: FocusKeeper,
    marks: boolean[],
    defaultBubbleSlot: DefaultBubbleSlot
  }) {
    console.log("setBuiltBook", builtBook);
    this.layeredCanvas = builtBook.layeredCanvas;
    this.arrayLayer = builtBook.arrayLayer;
    this.focusKeeper = builtBook.focusKeeper;
    this.marks = builtBook.marks;
    this.defaultBubbleSlot = builtBook.defaultBubbleSlot;
  }

  setMarks(marks: boolean[]) {
    this.marks = marks;
  }

  getMarks(): boolean[] {
    return this.marks;
  }

  hint(r: Rect | null, s: string | null): void {
    if (r === null || s === null) {
      toolTipRequest.set(null);
    } else {
      const q0 = convertPointFromNodeToPage(this.canvas, r[0], r[1]);
      toolTipRequest.set({
        message: s,
        rect: { left: q0.x, top: q0.y, width: r[2], height: r[3] }
      });
    }
  }

  commit(tag: HistoryTag): void {
    commit(tag);
  }

  forceDelayedCommit(): void {
    delayedCommiter.force();
  }

  cancelDelayedCommit(): void {
    delayedCommiter.cancel();
  }

  revert(): void {
    revert();
  }

  undo(): void {
    if (this.focusKeeper) {
      undoBookState(this.focusKeeper);
    }
  }

  redo(): void {
    if (this.focusKeeper) {
      redoBookState(this.focusKeeper);
    }
  }

  shift(page: Page, frameElement: FrameElement): void {
    const frameSeq = collectBookContents(this.book);
    dealBookContents(frameSeq, frameElement, null);
    commit(null);
  }

  unshift(page: Page, frameElement: FrameElement): void {
    const frameSeq = collectBookContents(this.book);
    dealBookContents(frameSeq, null, frameElement);
    commit(null);
  }

  swap(page: Page, frameElement0: FrameElement, frameElement1: FrameElement): void {
    const frameSeq = collectBookContents(this.book);
    swapBookContents(frameSeq, frameElement0, frameElement1);
    commit(null);
  }

  insert(page: Page, border: Border): void {
    const element = border.layout.element;
    const index = border.index;
    element.insertElement(index);
    commit(null);
  }

  focusFrame(page: Page, f: FrameElement | null, p: Vector | null): void {
    if (f) {
      const [cx, cy] = p!;
      const offset = this.canvas.height / 2 < cy ? -1 : 1;

      frameInspectorTarget.set({
        frame: f,
        page,
        command: null,
        commandTargetFilm: null,
      });
    } else {
      // フレームのインスペクタを非表示
      frameInspectorTarget.set(null);
    }
  }

  focusBubble(page: Page, b: Bubble | null): void {
    delayedCommiter.force();
    if (b) {
      if (this.arrayLayer) {
        console.log("show bubble");
        const bp = b.getPhysicalCenter(page.paperSize);
        const pageIndex = this.book.pages.findIndex(p => p.id === page.id);
        const rp = this.arrayLayer.array.childPositionToParentPosition(pageIndex, bp);
        const cp = this.layeredCanvas!.rootPaperPositionToCanvasPosition(rp);

        bubbleInspectorTarget.set({
          bubble: b,
          page,
          command: null,
          commandTargetFilm: null,
        });
        
        // defaultBubbleSlotを設定
        this.defaultBubbleSlot!.bubble = b;
      }
    } else {
      // バブルのインスペクタを非表示
      bubbleInspectorTarget.set(null);
    }
  }

  viewportChanged(): void {
    // viewportストアの更新をトリガー
    viewport.update(v => v);
  }

  insertPage(index: number): void {
    console.log("this", this);
    insertPage(
      this.book, 
      index,
      (tag: HistoryTag) => commit(tag),
      this.focusKeeper!,
      v => redrawToken.set(v)
    );
  }

  deletePage(index: number): void {
    deletePage(
      this.book, 
      index, 
      (tag: HistoryTag) => commit(tag)
    );
  }

  movePages(from: number[], to: number): void {
    movePages(
      this.book, 
      from, 
      to, 
      (tag: HistoryTag) => commit(tag)
    );
  }

  duplicatePages(from: number[], to: number): void {
    duplicatePages(
      this.book, 
      from, 
      to, 
      (tag: HistoryTag) => commit(tag)
    );
  }

  rescueResidual(media: HTMLCanvasElement | HTMLVideoElement | string): void {
    console.log("rescueResidual", media);

    if (typeof media === "string") { return; }

    const page = this.book.pages[this.book.pages.length - 1];
    const paperSize = page.paperSize;

    const rootFrameTree = FrameElement.compile(frameExamples[2].frameTree);
    const frameTree = rootFrameTree.children[0];
    const film = new Film(buildMedia(media));
    frameTree.filmStack.films = [film];

    const transformer = new FilmStackTransformer(paperSize, frameTree.filmStack.films);
    transformer.scale(0.01);
    const layout = calculatePhysicalLayout(rootFrameTree, paperSize, [0, 0]);
    constraintLeaf(page.paperSize, findLayoutOf(layout, frameTree)!);

    page.frameTree = rootFrameTree;

    commit(null);
  }

  copyPageToClipboard(index: number): void {
    const copyPageFunc = makeCopyPageToClipboard(
      this.book,
      analyticsEvent,
      (page: Page, flag: boolean) => {
        copyToClipboard(page, flag);
      }
    );
    copyPageFunc(index);
  }

  batchImaging(index: number): void {
    makeBatchImaging(
      this.book,
      (v: any) => frameInspectorTarget.set(v),
      (v: any) => bubbleInspectorTarget.set(v),
      (page: any) => batchImagingPage.set(page)
    )(index);
  }

  editBubbles(index: number): void {
    makeEditBubbles(
      this.book,
      delayedCommiter.force.bind(delayedCommiter),
      (page: any) => bubbleBucketPage.set(page)
    )(index);
  }

  tweak(index: number): void {
    makeTweak(
      this.book,
      (page: any) => pageInspectorTarget.set(page)
    )(index);
  }

  chase(): void {
    this.painterChase();
  }


  getFocusedPage(): Page {
    if (!this.arrayLayer) {
      return this.book.pages[0];
    }
    
    // viewportの中央に最も近いページを返す
    const p = this.layeredCanvas!.viewport.canvasPositionToViewportPosition(
      this.layeredCanvas!.viewport.getCanvasCenter()
    );
    const index = this.arrayLayer.array.findNearestPaperIndex(p);
    return this.book.pages[index];
  }
}