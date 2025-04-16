<script lang="ts">
  import { setLayerRefs, commit } from './operations/commitOperations';
  import { BookWorkspaceOperators } from './BookWorkspaceOperators';
  import { onDestroy } from 'svelte';
  import { type LayeredCanvas, Viewport } from '../lib/layeredCanvas/system/layeredCanvas';
  import { setBubbleCommandTools } from './bubbleinspector/bubbleInspectorStore';
  import { setFrameCommandTools } from './frameinspector/frameInspectorStore';
  import type { Book, ReadingDirection, WrapMode } from '../lib/book/book';
  import { mainBook, bookEditor, viewport, redrawToken, undoToken } from './bookStore';
  import { buildBookEditor, getFoldAndGapFromWrapMode, getDirectionFromReadingDirection } from './operations/buildBookEditor';
  import { hint } from './bookEditorUtils';
  import AutoSizeCanvas from '../utils/AutoSizeCanvas.svelte';
  import { BubbleLayer } from '../lib/layeredCanvas/layers/bubbleLayer';
  import Painter from '../painter/Painter.svelte';
  import type { ArrayLayer } from '../lib/layeredCanvas/layers/arrayLayer';
  import ImageProvider from '../generator/ImageProvider.svelte';
  import { PaperRendererLayer } from '../lib/layeredCanvas/layers/paperRendererLayer';
  import { bubbleBucketDirty } from '../bubbleBucket/bubbleBucketStore';

  let canvas: HTMLCanvasElement;
  let painter: Painter;
  let imageProvider: ImageProvider;

  // コンポーネントで直接参照する必要のあるものだけ保持
  let layeredCanvas : LayeredCanvas;
  let arrayLayer: ArrayLayer;

  let editingBookId: string | null = null;
  let editingPageIds: string[] = [];
  let editingReadingDirection: ReadingDirection;
  let editingWrapMode: WrapMode;
  let forceRebuild = false;

  let bookEditorInstance: BookWorkspaceOperators;

  $: onUndoCommand($undoToken);
  function onUndoCommand(t: 'undo' | 'redo' | null) {
    $undoToken = null;
    if (t == 'undo') { undo(); }
    if (t == 'redo') { redo(); }
  }

  // undo操作 - ペイント中ならペインタのundo、そうでなければbookのundo
  function undo() {
    if (painter.isPainting()) {
      painter.undo();
    } else {
      bookEditorInstance.undo();
    }
  }

  // redo操作 - ペイント中ならペインタのredo、そうでなければbookのredo
  function redo() {
    if (painter.isPainting()) {
      painter.redo();
    } else {
      bookEditorInstance.redo();
    }
  }

  $: if ($bubbleBucketDirty) {
    commit(null);
    $bubbleBucketDirty = false;
  }

  $: onChangePaperSize($mainBook?.newPageProperty.paperSize);
  function onChangePaperSize(paperSize: [number, number] | undefined) {
    if (paperSize == null) { return; }
    let modified = false;
    for (const page of $mainBook!.pages) {
      if (page.paperSize[0] === paperSize[0] && page.paperSize[1] === paperSize[1]) {
        continue;
      }
      page.paperSize = [...paperSize];
      modified = true;
    }
    if (!modified) { return; }
    forceRebuild = true;
    $mainBook = $mainBook;
    commit('page-size');
  }

  $: onChangeBookProperty($mainBook?.direction, $mainBook?.wrapMode);
  function onChangeBookProperty(newDirection: ReadingDirection | undefined, newWrapMode: WrapMode | undefined) {
    if (newDirection == null || newWrapMode == null) { return; }
    if (editingReadingDirection != newDirection || editingWrapMode != newWrapMode) {
      editingReadingDirection = newDirection;
      editingWrapMode = newWrapMode;
      forceRebuild = true;
      $mainBook = $mainBook;
      commit(null);
    }
  }

  $: onChangeBook(canvas, $mainBook!);
  function onChangeBook(canvas: HTMLCanvasElement, book: Book) {
    console.log("onChangeBook");
    if (!canvas || !book) { return; }

    if (arrayLayer &&
        (editingReadingDirection != book.direction ||
         editingWrapMode != book.wrapMode)) {

      editingReadingDirection = book.direction;
      editingWrapMode = book.wrapMode;


      const direction = getDirectionFromReadingDirection(book.direction);
      const {fold, gapX, gapY} = getFoldAndGapFromWrapMode(editingWrapMode);
      arrayLayer.array.direction = direction;
      arrayLayer.array.fold = fold;
      arrayLayer.array.gapX = gapX;
      arrayLayer.array.gapY = gapY;
      for (const paper of arrayLayer.array.papers) {
        paper.paper.findLayer(BubbleLayer)!.setFold(fold);
      }

      $viewport!.dirty = true;
    }

    const newPageIds = book.pages.map(p => p.id);
    if (!forceRebuild) {
      if (arrayLayer) {
        if (editingPageIds.join(",") === newPageIds.join(",")) {
          // frames/bubblesの再設定だけは毎回しておく
          let i = 0;
          for (const paper of arrayLayer.array.papers) {
            const rendererLayer = paper.paper.findLayer(PaperRendererLayer) as PaperRendererLayer;
            rendererLayer.setBubbles(book.pages[i].bubbles);
            rendererLayer.setFrameTree(book.pages[i].frameTree);
            i++;
          }
          layeredCanvas.redraw();
          return;
        }
      }
    }
    editingPageIds = newPageIds;
    forceRebuild = false;

    console.log("*********** buildBookEditor from BookEditor");
    layeredCanvas?.cleanup();

    if (!$viewport || editingBookId !== book.revision.id) {
      console.log("================ viewport remake");
      const v = new Viewport(canvas, (p,s) => hint(canvas, p, s));
      v.translate = [150, 0];
      $viewport = v;
    }
    $viewport.dirty = true;
    editingBookId = book.revision.id;
    
    // BookEditorImplインスタンスを作成
    bookEditorInstance = new BookWorkspaceOperators(
      canvas,
      book,
      () => painter.chase()
    );
    
    // BookEditorImplは自身でhintとviewportChangedを実装
    
    $bookEditor = bookEditorInstance;

    // BookEditorに必要なリソースをビルド
    const builtBook = buildBookEditor(
      $viewport,
      book,
      $bookEditor);
    
    // BookEditorImplに作成したリソースを一括設定
    bookEditorInstance.setBuiltBook(builtBook);
    
    // Painterなど他のコンポーネントでも使用するため、ローカル変数に保持
    layeredCanvas = builtBook.layeredCanvas;
    arrayLayer = builtBook.arrayLayer;
    
    setLayerRefs(layeredCanvas, arrayLayer);
    layeredCanvas.redraw();
  }

  $: setFrameCommandTools(
    painter?.runWithFrame?.bind(painter),
    imageProvider?.run?.bind(imageProvider)
  );

  $: setBubbleCommandTools(
    painter?.runWithBubble?.bind(painter),
    imageProvider?.run?.bind(imageProvider)
  );

  onDestroy(() => {
    layeredCanvas?.cleanup();
  });

  function onResizeCanvas(e: CustomEvent) {
    if (!layeredCanvas || !$viewport) { return; }
    $viewport.dirty = true;
  }

  $: onRedraw($redrawToken);
  function onRedraw(token: boolean) {
    if (!token) { return; }
    layeredCanvas?.redraw();
    $redrawToken = false;
  }

  $: if ($viewport?.dirty) {
    layeredCanvas?.redraw();    
  }
</script>

<div class="main-paper-container">
  <AutoSizeCanvas bind:canvas on:resize={onResizeCanvas}>
  </AutoSizeCanvas>
</div>

<Painter bind:this={painter} bind:layeredCanvas bind:arrayLayer />
<ImageProvider bind:this={imageProvider} />

<style>
  .main-paper-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
