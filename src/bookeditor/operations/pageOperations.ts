import type { Book, HistoryTag, Page } from '../../lib/book/book';
import { insertNewPageToBook } from '../bookStore';
import { triggerTemplateChoice } from "../templateChooserStore";
import type { FocusKeeper } from "../../lib/layeredCanvas/tools/focusKeeper";
import { clonePage } from '../../lib/book/book';

////////////////////////////////////////////////////////////////
// 各種処理
export function insertPage(
  book: Book,
  pageIndex: number,
  commit: (tag: HistoryTag) => void,
  focusKeeper: FocusKeeper,
  setRedrawToken: (value: boolean) => void
) {
  focusKeeper.setFocus(null);
  setRedrawToken(true);
  return triggerTemplateChoice.trigger().then(result => {
    if (result != null) {
      book.newPageProperty.templateName = result;
      insertNewPageToBook(book, pageIndex);
      commit(null);
    }
  });
}

export function deletePage(
  book: Book,
  index: number,
  commit: (tag: HistoryTag) => void
) {
  book.pages.splice(index, 1);
  commit(null);
}

export function movePages(
  book: Book,
  from: number[],
  to: number,
  commit: (tag: HistoryTag) => void
) {
  const restPages = book.pages.filter((_, i) => !from.includes(i));
  const movedPages = from.map(i => book.pages[i]);
  book.pages = [...restPages.slice(0, to), ...movedPages, ...restPages.slice(to)];
  commit(null);
}

export function duplicatePages(
  book: Book,
  from: number[],
  to: number,
  commit: (tag: HistoryTag) => void
) {
  const targetPages = from.map(i => clonePage(book.pages[i]));
  book.pages = [
    ...book.pages.slice(0, to),
    ...targetPages,
    ...book.pages.slice(to)
  ];
  commit(null);
}

////////////////////////////////////////////////////////////////
// ラッパー
export function makeCopyPageToClipboard(
  book: Book,
  analyticsEvent: (event: string) => void,
  copyToClipboard: (page: Page, flag: boolean) => void
) {
  return (index: number) => {
    const page = book.pages[index];
    analyticsEvent('copy_page_to_clipboard');
    copyToClipboard(page, false);
  };
}

export function makeBatchImaging(
  book: Book,
  setFrameInspectorTarget: (v: any) => void,
  setBubbleInspectorTarget: (v: any) => void,
  setBatchImagingPage: (page: Page) => void
) {
  return (index: number) => {
    setFrameInspectorTarget(null);
    setBubbleInspectorTarget(null);
    setBatchImagingPage(book.pages[index]);
  };
}

export function makeEditBubbles(
  book: Book,
  delayedCommiterForce: () => void,
  setBubbleBucketPage: (page: Page) => void
) {
  return (index: number) => {
    delayedCommiterForce();
    setBubbleBucketPage(book.pages[index]);
  };
}

export function makeTweak(
  book: Book,
  setPageInspectorTarget: (page: Page) => void
) {
  return (index: number) => {
    setPageInspectorTarget(book.pages[index]);
  };
}