import type { HistoryTag } from '../../lib/book/book';
import { commitBook, revertBook, undoBookHistory, redoBookHistory } from '../../lib/book/book';
import { mainBook } from '../bookStore';
import type { ArrayLayer } from '../../lib/layeredCanvas/layers/arrayLayer';
import { PaperRendererLayer } from '../../lib/layeredCanvas/layers/paperRendererLayer';
import { bubbleInspectorTarget } from '../bubbleinspector/bubbleInspectorStore';
import { frameInspectorTarget } from '../frameinspector/frameInspectorStore';
import { DelayedCommiterGroup } from '../../utils/delayedCommiter';
import type { LayeredCanvas } from '../../lib/layeredCanvas/system/layeredCanvas';
import type { FocusKeeper } from '../../lib/layeredCanvas/tools/focusKeeper';

// レイヤードキャンバスの参照
let _layeredCanvas: LayeredCanvas | null = null;
let _arrayLayer: ArrayLayer | null = null;

export function setLayerRefs(layeredCanvas: LayeredCanvas, arrayLayer: ArrayLayer) {
  _layeredCanvas = layeredCanvas;
  _arrayLayer = arrayLayer;
}

// コミット関連のDelayedCommiterGroup
export const delayedCommiter = new DelayedCommiterGroup({
  "standard": () => {
    commitInternal(null);
  },
  "bubble": () => {
    commitInternal("bubble");
  },
  "effect": () => {
    commitInternal("effect");
  },
  "page-size": () => {
    commitInternal("page-size");
  },
});

// 内部コミット実装
function commitInternal(tag: HistoryTag) {
  mainBook.update(book => {
    if (book) {
      commitBook(book, tag);
      console.tag("commit", "cyan", book.revision, book.history.entries[book.history.cursor-1]);
    }
    return book;
  });
  
  // コミット後に再描画
  if (_layeredCanvas) {
    resetBubbleCache();
    _layeredCanvas.redraw();
  }
}

// バブルキャッシュをリセット
function resetBubbleCache() {
  if (!_arrayLayer) return;
  
  mainBook.subscribe(book => {
    if (!book) return;
    
    let i = 0;
    const pages = book.pages;
    if (pages.length != _arrayLayer!.array.papers.length) {
      // ページ数が変わったため、再構築するはずなので無視して良い
      return;
    }
    for (const paper of _arrayLayer!.array.papers) {
      const rendererLayer = paper.paper.findLayer(PaperRendererLayer) as PaperRendererLayer;
      rendererLayer.setBubbles(pages[i++].bubbles);
      rendererLayer.resetCache();
    }
  })();  // subscribe結果を即座に実行して解除
}

// 外部向けコミット関数
export function commit(tag: HistoryTag) {
  delayedCommiter.schedule(tag ?? "standard", tag ? 2000 : 0);
  if (tag === 'bubble') {
    bubbleInspectorTarget.update(target => target);
  }
}

// 変更をキャンセルして元に戻す
export function revert() {
  delayedCommiter.cancel();
  
  mainBook.update(book => {
    if (book) {
      revertBook(book);
    }
    return book;
  });
  
  resetBubbleCache();
  frameInspectorTarget.set(null);
  
  if (_layeredCanvas) {
    _layeredCanvas.redraw();
  }
}

// undo操作（bookの状態のみ）
export function undoBookState(focusKeeper: FocusKeeper) {
  mainBook.update(book => {
    if (book) {
      undoBookHistory(book);
      revertBook(book);
    }
    return book;
  });
  
  focusKeeper.setFocus(null);
  resetBubbleCache();
  
  if (_layeredCanvas) {
    _layeredCanvas.redraw();
  }
}

// redo操作（bookの状態のみ）
export function redoBookState(focusKeeper: FocusKeeper) {
  mainBook.update(book => {
    if (book) {
      redoBookHistory(book);
      revertBook(book);
    }
    return book;
  });
  
  focusKeeper.setFocus(null);
  resetBubbleCache();
  
  if (_layeredCanvas) {
    _layeredCanvas.redraw();
  }
}
