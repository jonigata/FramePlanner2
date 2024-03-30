import type { Book } from "../bookeditor/book"

export type Context = {
  book: Book;
  pageIndex: number;
};

