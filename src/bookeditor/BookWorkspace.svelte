<script lang="ts">
  import { setLayerRefs, commit } from './operations/commitOperations';
  import { BookWorkspaceOperators } from './BookWorkspaceOperators';
  import { onDestroy } from 'svelte';
  import { type LayeredCanvas, Viewport } from '../lib/layeredCanvas/system/layeredCanvas';
  import { setBubbleCommandTools } from './bubbleinspector/bubbleInspectorStore';
  import { setFrameCommandTools } from './frameinspector/frameInspectorStore';
  import type { Book } from '../lib/book/book';
  import { mainBook, bookOperators, viewport, redrawToken, undoToken } from './bookStore';
  import { buildBookEditor } from './operations/buildBookEditor';
  import { hint } from './bookEditorUtils';
  import AutoSizeCanvas from '../utils/AutoSizeCanvas.svelte';
  import Painter from '../painter/Painter.svelte';
  import type { ArrayLayer } from '../lib/layeredCanvas/layers/arrayLayer';
  import ImageProvider from '../generator/ImageProvider.svelte';
  import { bubbleBucketDirty } from '../bubbleBucket/bubbleBucketStore';

  let canvas: HTMLCanvasElement;
  let painter: Painter;
  let imageProvider: ImageProvider;

  let layeredCanvas : LayeredCanvas;
  let arrayLayer: ArrayLayer;

  let editingBookId: string | null = null;

  let operators: BookWorkspaceOperators;

  $: onUndoCommand($undoToken);
  function onUndoCommand(t: 'undo' | 'redo' | null) {
    $undoToken = null;
    if (t == 'undo') { undo(); }
    if (t == 'redo') { redo(); }
  }

  function undo() {
    if (painter.isPainting()) {
      painter.undo();
    } else {
      operators.undo();
    }
  }

  function redo() {
    if (painter.isPainting()) {
      painter.redo();
    } else {
      operators.redo();
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
    commit('page-size');
  }

  $: onChangeBook(canvas, $mainBook);
  function onChangeBook(canvas: HTMLCanvasElement | null, book: Book | null) {
    console.log("onChangeBook");
    if (!canvas || !book) { return; }

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
    
    operators = new BookWorkspaceOperators(canvas, book, () => painter.chase());
    $bookOperators = operators;

    const builtBook = buildBookEditor($viewport, book, $bookOperators);
    operators.setBuiltBook(builtBook);
    
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

  $: onRedraw($redrawToken);
  function onRedraw(token: boolean) {
    if (!token) { return; }
    layeredCanvas?.redraw();
    $redrawToken = false;
  }

  function onResizeCanvas(e: CustomEvent) {
    if (!layeredCanvas || !$viewport) { return; }
    $viewport.dirty = true;
  }

  $: if ($viewport?.dirty) {
    layeredCanvas?.redraw();
  }

  onDestroy(() => {
    layeredCanvas?.cleanup();
  });
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
