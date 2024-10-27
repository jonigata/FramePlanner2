import type { Book } from "../lib/book/book"

export type Context = {
  book: Book;
  pageIndex: number;
};

